import {checkSize, checkMode, calculateHash} from './until';
import {
    READY,
    PARSE,
    UPLOAD,
    PAUSED,
    FINISH,
    DESTROY,
    SERIAL
} from './const'
import {FileChunk} from "@/types.ts";

export default class ChunkUploadFile {
    // 初始化传入size,mode
    private chunkSize: number;
    private accept: string;
    private fileId: string;
    private hashProgress: () => void;
    private fileChunkList: FileChunk[];
    private file: null | File;
    private fileName: string;
    // @ts-ignore
    private fileSize: number | '';
    // @ts-ignore
    private fileType: string;
    private chunkLength: number;
    // @ts-ignore
    private errIds: { [key: string | number]: any };
    private sucIds: { [key: string | number]: any };
    private paused: boolean;
    private mode: string;
    private customReq: Promise<any> | null;
    private state: string;

    constructor({size, mode, accept = []}: { size: number, mode: string, accept: string[] }) {
        this.chunkSize = checkSize(size) ? size : 1 * 1024 * 1024
        this.accept = (accept && accept.length > 0) ? accept.join(',') : ''
        this.fileId = ''//文件hash值
        this.hashProgress = function () {
        }//计算hash的进度函数
        // this.uploadProgress = function () { }//上传的进度函数
        this.fileChunkList = []//切片后的文件列表
        this.file = null//文件
        this.fileName = ''
        this.fileSize = ''
        this.fileType = ''
        this.chunkLength = 0
        this.errIds = {}//上传错误的下标
        this.sucIds = {}//上传成功的下标
        this.paused = false//暂停flag
        this.mode = checkMode(mode) ? mode : SERIAL// 并行:parallel，串行：serial
        this.customReq = null //用于缓存用户的自定义上传请求
        this.state = READY//状态 ready parse upload paused finish destroy fail
    }

    // 获取文件
    async readFile() {
        try {
            if (this.state === DESTROY) {
                console.error('js-chunk-file-upload实例已经被销毁');
                return false
            }
            // 重置数据
            this.resetData()
            this.file = await this.showFileWindow()
            // 改变状态
            this.state = PARSE
            // 设置值
            const {name, type, size} = this.file
            this.fileName = name
            this.fileType = type
            this.fileSize = size
            this.fileId = await calculateHash(this.file, this.hashProgress)
            this.fileChunkList = await this.chunkFile(this.file)
            if (this.onFileReadEnd) {
                this.onFileReadEnd(this.file, this.fileId)
            }
            return new Promise((resolve) => {
                resolve(this.fileId)
            })
        } catch (e) {
            return Promise.reject(e)
        }
    }

    // 切片上传文件
    async sendFile({customReq, savedChunkIds}: {
        customReq: Promise<any> | null,
        savedChunkIds?: number[]
    }) {
        if (this.state === DESTROY) {
            console.error('js-chunk-file-upload实例已经被销毁');
            return false
        }
        this.state = UPLOAD
        if (customReq) {
            this.customReq = customReq
        }
        // 去除已经存在的
        if (savedChunkIds && savedChunkIds.length > 0) {
            savedChunkIds.map(i => {
                // @ts-ignore
                if (this.sucIds[i] === undefined || this.sucIds[i] === null) {
                    // @ts-ignore
                    this.sucIds[i] = i
                }
            })
        }
        this.uploadChunks(this.fileChunkList, this.customReq)
    }

    // 打开文件框
    showFileWindow(): Promise<File> {
        return new Promise((resolve) => {
            /* 在内存中创建一个input对象（无需注入DOM） */
            const input = document.createElement('input')
            /* 改为文件模式 */
            input.type = 'file'
            /*加入接受文件格式*/
            if (this.accept) {
                input.accept = this.accept
            }
            /* 多选模式 */
            input.multiple = true
            /* 定义文件选择监听 */
            input.onchange = function (e: any) {
                /* 初始化文件容器 */
                const Files = Array.from(e.target.files) as File[]
                resolve(Files[0])
            }
            input.click()
        })
    }

    // 切片文件
    async chunkFile(file: File, size = this.chunkSize): Promise<FileChunk[]> {
        try {
            const fileChunkList: FileChunk[] = [];
            let curChunkIndex = 0;
            let fileIndex = 0
            const chunkLength = Math.ceil(file.size / size)
            this.chunkLength = chunkLength
            while (curChunkIndex <= file.size) {
                const chunk = file.slice(curChunkIndex, curChunkIndex + size);
                // 包装文件
                fileChunkList.push({
                    file: chunk,
                    index: fileIndex,
                    chunkId: fileIndex,
                    md5: this.fileId,
                    chunkLength,
                    name: this.fileName,
                    size: chunk.size
                })
                curChunkIndex += size;
                fileIndex++
            }
            return new Promise((resolve) => {
                resolve(fileChunkList)
            })
        } catch (e) {
            return Promise.reject(e)
        }

    }

    // 包装请求，实现自定义请求
    // @ts-ignore
    _packReq(chunkId: number, file: FileChunk, customReq: Promise) {
        const that = this
        // 将file的信息存为私有值，方便后续记录
        let _data: any = {chunkId: file.chunkId, md5: file.md5}
        return new Promise<void>((resolve) => {
            const next = () => {
                that.sucIds[_data.chunkId] = _data.chunkId
                const sucLen = Object.keys(that.sucIds).length
                const precent = (sucLen / that.chunkLength).toFixed(3)
                if (that.onUpload) {
                    that.onUpload(Number(precent), _data.chunkId)
                }
                // 回收_data
                _data = null
                resolve()
            }
            customReq(file, next, _data)
        })


    }

    // 上传分片
    async uploadChunks(fileList: FileChunk[], customReq: Promise<void> | null) {
        if (customReq) {
            if (this.mode === SERIAL) {

                for (let index = 0; index < fileList.length; index++) {
                    if (this.state === DESTROY) {
                        return false
                    }
                    const file = fileList[index];
                    if (!(this.sucIds[file.chunkId] === undefined || this.sucIds[file.chunkId] === null)) {
                        continue
                    }
                    if (this.paused) {
                        return false
                    }
                    await this._packReq(file.chunkId, file, customReq)

                }
                this.state = FINISH
                if (this.onFullUpload) {
                    this.onFullUpload(this.fileId)
                }
            } else {
                const reqList: Promise<any>[] = []
                fileList.map((file) => {
                    if (this.sucIds[file.chunkId] === undefined || this.sucIds[file.chunkId] === null) {
                        reqList.push(
                            this._packReq(file.chunkId, file, customReq)
                        )
                    }
                })
                Promise.all(reqList).then(() => {
                    this.state = FINISH
                    if (this.onFullUpload) {
                        this.onFullUpload(this.fileId)
                    }
                })
                    .catch((err) => {
                        if (err !== PAUSED) {
                            this.state = PAUSED
                        }
                    })
            }
        } else {
            throw new Error('缺失请求方法')
        }
    }

    // 包装当个分片文件
    packgeChunk(file: FileChunk) {
        // 创建数据容器
        const formdata = new FormData();
        // @ts-ignore
        Object.keys(file).map((key: keyof FileChunk) => {
            // @ts-ignore
            formdata.append(key, file[key])
        })

        /* 将数据注入CloudChunk实例对象 */
        return formdata;
    }

    // 暂停上传
    pauseUpload() {
        if (this.state === DESTROY) {
            console.error('js-chunk-file-upload实例已经被销毁');
            return false
        }
        if (this.mode === SERIAL) {
            this.paused = true
            this.state = PAUSED
            if (this.onPaused) {
                this.onPaused()
            }
        } else {
            console.error('并行模式不能使用暂停功能')
        }
    }

    // 继续上传
    continueUpload() {
        if (this.state === DESTROY) {
            console.error('js-chunk-file-upload实例已经被销毁');
            return false
        }
        if (this.mode === SERIAL) {
            this.paused = false
            this.state = UPLOAD
            this.sendFile({customReq: this.customReq})
            if (this.onContinue) {
                this.onContinue()
            }
        } else {
            console.error('并行模式不能使用暂停功能')
        }
    }

    destroy() {
        this.state = DESTROY
        if (this.onDestroy) {
            this.onDestroy()
        }
    }

    restart() {
        this.resetData()
        if (this.onRestart) {
            this.onRestart()
        }
    }

    // 钩子函数
    public onFileReadEnd: ((file: File, fileId: string) => void) | undefined;

    public onUpload: ((progress: number, index: number) => void) | undefined;

    public onFullUpload: ((fileId: string) => void) | undefined;

    public onDestroy: (() => void) | undefined;

    public onRestart: (() => void) | undefined;

    public onPaused: (() => void) | undefined;

    public onContinue: (() => void) | undefined;

    resetData() {
        this.fileId = ''//文件hash值
        this.hashProgress = function () {
        }//计算hash的进度函数
        // this.uploadProgress = function () { }//上传的进度函数
        this.fileChunkList = []//切片后的文件列表
        this.file = null//文件
        this.fileName = ''
        this.fileSize = ''
        this.fileType = ''
        this.errIds = {}//上传错误的下标
        this.sucIds = {}//上传成功的下标
        this.paused = false//暂停flag
        this.customReq = null //用于缓存用户的自定义上传请求
        this.state = READY
    }
}
