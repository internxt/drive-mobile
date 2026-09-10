import sqliteService from '../../SqliteService';
import mailEmailTable from './tables/mail_email';

export const MAIL_DB_NAME = 'mail.db';

export type SqliteMailEmailRow = {
  id: string;
  text_body: string;
  attachments_session_key: string;
  cached_at: string;
};

export type CachedDecryptedEmail = {
  text: string;
  attachmentsSessionKey: string; // base64
};

class MailLocalDB {
  private initPromise: Promise<void> | null = null;

  private ensureInit(): Promise<void> {
    this.initPromise ??= this.init();
    return this.initPromise;
  }

  public async init(): Promise<void> {
    await sqliteService.open(MAIL_DB_NAME);
    await sqliteService.executeSql(MAIL_DB_NAME, mailEmailTable.statements.createTable);
  }

  public async getCachedEmail(id: string): Promise<CachedDecryptedEmail | null> {
    await this.ensureInit();
    const row = await sqliteService.getFirstAsync<SqliteMailEmailRow>(MAIL_DB_NAME, mailEmailTable.statements.getById, [
      id,
    ]);
    if (!row) return null;
    return { text: row.text_body, attachmentsSessionKey: row.attachments_session_key };
  }

  public async saveCachedEmail(id: string, decrypted: CachedDecryptedEmail): Promise<void> {
    await this.ensureInit();
    await sqliteService.executeSql(MAIL_DB_NAME, mailEmailTable.statements.insert, [
      id,
      decrypted.text,
      decrypted.attachmentsSessionKey,
      new Date().toISOString(),
    ]);
  }

  public async deleteCachedEmail(id: string): Promise<void> {
    await this.ensureInit();
    await sqliteService.executeSql(MAIL_DB_NAME, mailEmailTable.statements.deleteById, [id]);
  }

  public async deleteCachedEmails(ids: string[]): Promise<void> {
    await this.ensureInit();
    for (const id of ids) {
      await this.deleteCachedEmail(id);
    }
  }

  public async resetDatabase(): Promise<void> {
    await this.ensureInit();
    await sqliteService.executeSql(MAIL_DB_NAME, mailEmailTable.statements.dropTable);
    await sqliteService.close(MAIL_DB_NAME);
    await sqliteService.delete(MAIL_DB_NAME);
    this.initPromise = null;
    await this.ensureInit();
  }
}

export const mailLocalDB = new MailLocalDB();
