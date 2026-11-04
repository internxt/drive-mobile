import { useEffect, useState } from 'react';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';

const MIN_REPORTED_HEIGHT_CHANGE = 2;
const FALLBACK_BODY_HEIGHT = 320;
const MEASURE_TIMEOUT_MS = 4000;

const HEIGHT_REPORTER_SCRIPT = `
  (function () {
    var lastReported = 0;
    var report = function () {
      var height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (Math.abs(height - lastReported) < ${MIN_REPORTED_HEIGHT_CHANGE}) {
        return;
      }
      lastReported = height;
      window.ReactNativeWebView.postMessage(String(height));
    };
    report();
    if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  })();
  true;
`;

export type MeasuredEmailBodyHeight = {
  height: number;
  heightReporterScript: string;
  onHeightReported: (reportedHeight: string) => void;
  onMeasureFailed: (reason: unknown) => void;
};

/**
 * Keeps the height a message needs to be displayed in full, which only the document itself knows.
 * The height starts unknown and falls back to a height that shows something when the document
 * cannot report one, so that a message is never left invisible.
 *
 * @param emailDocument the document handed to the web view; a new one starts the measuring again
 * @returns the height measured so far, the script that reports it, and the handlers for what the
 * web view sends back
 */
export const useEmailBodyHeight = (emailDocument: string): MeasuredEmailBodyHeight => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setHeight(0);
    const timeout = setTimeout(() => setHeight((current) => current || FALLBACK_BODY_HEIGHT), MEASURE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [emailDocument]);

  const onHeightReported = (reportedHeight: string) => {
    const measuredHeight = Number(reportedHeight);
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
      return;
    }
    setHeight(measuredHeight);
  };

  const onMeasureFailed = (reason: unknown) => {
    logger.error('The body of an email could not be displayed:', reason);
    setHeight((current) => current || FALLBACK_BODY_HEIGHT);
  };

  return { height, heightReporterScript: HEIGHT_REPORTER_SCRIPT, onHeightReported, onMeasureFailed };
};
