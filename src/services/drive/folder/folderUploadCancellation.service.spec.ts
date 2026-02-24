import { folderUploadCancellationService } from './folderUploadCancellation.service';

const UPLOAD_ID_1 = 'upload-1';
const UPLOAD_ID_2 = 'upload-2';
const UNREGISTERED_ID = 'nonexistent-upload';

let service: typeof folderUploadCancellationService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  service = require('./folderUploadCancellation.service').folderUploadCancellationService;
});

describe('FolderUploadCancellationService', () => {
  describe('cancel', () => {
    it('when cancelling a registered upload, then its abort signal is triggered', () => {
      const controller = new AbortController();
      service.register(UPLOAD_ID_1, controller);

      service.cancel(UPLOAD_ID_1);

      expect(controller.signal.aborted).toBe(true);
    });

    it('when cancelling one upload, then other registered uploads are not affected', () => {
      const firstController = new AbortController();
      const secondController = new AbortController();
      service.register(UPLOAD_ID_1, firstController);
      service.register(UPLOAD_ID_2, secondController);

      service.cancel(UPLOAD_ID_1);

      expect(firstController.signal.aborted).toBe(true);
      expect(secondController.signal.aborted).toBe(false);
    });

    it('when cancelling an upload that was never registered, then it does not throw', () => {
      expect(() => service.cancel(UNREGISTERED_ID)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('when clearing a registered upload, then it is removed without triggering cancellation', () => {
      const controller = new AbortController();
      service.register(UPLOAD_ID_1, controller);

      service.clear(UPLOAD_ID_1);

      expect(controller.signal.aborted).toBe(false);
    });

    it('when clearing one upload, then other registered uploads remain unaffected', () => {
      const firstController = new AbortController();
      const secondController = new AbortController();
      service.register(UPLOAD_ID_1, firstController);
      service.register(UPLOAD_ID_2, secondController);

      service.clear(UPLOAD_ID_1);

      expect(secondController.signal.aborted).toBe(false);
    });

    it('when clearing an upload that was never registered, then it does not throw', () => {
      expect(() => service.clear(UNREGISTERED_ID)).not.toThrow();
    });
  });

  describe('multi-upload scenario', () => {
    it('when cancelling one of several registered uploads, then only that upload is aborted', () => {
      const firstController = new AbortController();
      const secondController = new AbortController();
      service.register(UPLOAD_ID_1, firstController);
      service.register(UPLOAD_ID_2, secondController);

      service.cancel(UPLOAD_ID_1);

      expect(firstController.signal.aborted).toBe(true);
      expect(secondController.signal.aborted).toBe(false);
    });

    it('when clearing a completed upload, then remaining uploads stay active', () => {
      const firstController = new AbortController();
      const secondController = new AbortController();
      service.register(UPLOAD_ID_1, firstController);
      service.register(UPLOAD_ID_2, secondController);

      service.clear(UPLOAD_ID_1);

      expect(firstController.signal.aborted).toBe(false);
      expect(secondController.signal.aborted).toBe(false);
    });
  });
});
