const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  order = ['signUp', 'signIn', 'driveUploadFile', 'driveDownloadFile'];

  sort(tests) {
    const copyTests = Array.from(tests);
    return copyTests.sort((testA, testB) => {
      const aIndex = this.order.findIndex((i) => testA.path.includes(i));
      const bIndex = this.order.findIndex((i) => testB.path.includes(i));

      return aIndex > bIndex ? 1 : -1;
    });
  }
}

module.exports = CustomSequencer;
