import { MlKem768 } from 'mlkem';

async function doMlKem() {
  const recipient = new MlKem768(); // MlKem512 and MlKem1024 are also available.
  const [pkR, skR] = await recipient.generateKeyPair();

  // A sender generates a ciphertext and a shared secret with pkR.
  const sender = new MlKem768();
  const [ct, ssS] = await sender.encap(pkR);

  // The recipient decapsulates the ciphertext and generates the same shared secret with skR.
  const ssR = await recipient.decap(ct, skR);

  return;
}

try {
  doMlKem();
} catch (err: unknown) {
  console.log('failed:', (err as Error).message);
}
