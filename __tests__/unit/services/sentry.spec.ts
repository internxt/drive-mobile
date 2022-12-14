import * as Sentry from 'sentry-expo';
import sentryTestkit from 'sentry-testkit';
const { testkit } = sentryTestkit();

beforeAll(() => {
  Sentry.init({
    enableInExpoDevelopment: true,
  });
});

test('Collect error events', function () {
  expect(testkit.reports()).toHaveLength(0);
});

test('Collect performance events', function () {
  expect(testkit.transactions()).toHaveLength(0);
});
