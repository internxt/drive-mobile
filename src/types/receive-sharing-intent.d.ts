declare module 'react-native-receive-sharing-intent' {
    interface ReceiveSharingFile {
        contentUri: string
        fileName: string
    }

    export function clearReceivedFiles(): void
    export function getReceivedFiles(file: (files: ReceiveSharingFile[]) => void, error: (err: Error) => void, schema: string): void
}