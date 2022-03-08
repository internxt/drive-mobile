import packageJson from '../../package.json';

class AppService {
  public get name(): string {
    return packageJson.name;
  }
  public get version(): string {
    return packageJson.version;
  }
}

const appService = new AppService();
export default appService;
