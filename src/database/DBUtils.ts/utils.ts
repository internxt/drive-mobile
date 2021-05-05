import { getRepository } from 'typeorm/browser';
import { Photos } from '../../database/models/photos';
import { Previews } from '../../database/models/previews';
import { deviceStorage } from '../../helpers';

export interface Repositories {
  photos: Photos[];
  previews: Previews[];
}

export async function getUserId() {
  const xUser = await deviceStorage.getItem('xUser');
  const xUserJson = JSON.parse(xUser || '{}');
  const user = xUserJson.userId;

  return user;
}

export async function getRepositories(): Promise<Repositories> {
  const userId = await getUserId()

  const photosRepository = await getRepository(Photos);
  const previewsRepository = await getRepository(Previews);

  const photos = await photosRepository.find({
    where: { userId: userId }
  })

  const previews = await previewsRepository.find({
    where: { userId: userId }
  })

  return { photos, previews }
}
