export function arrayOfFixtures<T>(fixtureCreator: () => T, times: number): T[] {
  const result: T[] = [];

  for (let i = 0; i < times; i++) {
    result.push(fixtureCreator());
  }
  return result;
}
