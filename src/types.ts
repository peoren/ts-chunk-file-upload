export interface FileChunk {

    file: Blob,
    index: number
    chunkId: number
    md5: string,
    chunkLength: number,
    name: string,
    size: number
}


