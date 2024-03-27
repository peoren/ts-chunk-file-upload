import SparkMD5 from 'spark-md5';
import {PARALLEL, SERIAL} from "@/const.ts";

export const request = ({
                            url,
                            method = "post",
                            data,
                            headers = {},
                            onprogress
                        }: {
    url: string,
    method?: 'post' | 'get',
    data?: any,
    headers?: any,
    onprogress?: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any)
}) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        Object.keys(headers).forEach(key =>
            xhr.setRequestHeader(key, headers[key])
        );
        if (onprogress) {
            xhr.upload.onprogress = onprogress
        }
        xhr.send(data);
        xhr.onload = (e: any) => {
            const status = e.target.status
            if (status === '200') {
                resolve({
                    data: e.target.response
                });
            } else {
                reject({
                    code: status,
                    e
                })
            }

        };
        xhr.onerror = e => {
            reject(e)
        }
    });
}
export const checkMode = (mode: string) => {
    if (mode) {
        if (mode === SERIAL || mode === PARALLEL) {

            return true
        } else {
            throw new Error('模式只有并行(parallel)或串行()')
        }
    }
}
export const checkSize = (size: number) => {
    if (size) {
        const RegEXP = /^\d{1,}$/
        if (RegEXP.test(size.toString())) {
            return true
        } else {
            throw new Error('size请输入至少一位的纯数字')
        }
    }
}
// 计算hash值
export const calculateHash = (file: File, progressFn: Function): Promise<string> => {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
            chunkSize = 2097152,                             // Read in chunks of 2MB
            chunks = Math.ceil(file.size / chunkSize),
            currentChunk = 0,
            spark = new SparkMD5.ArrayBuffer(),
            fileReader = new FileReader(),
            progress = 0;
        fileReader.onload = function (e: any) {
            spark.append(e.target.result);                   // Append array buffer
            currentChunk++;
            // 计算进度
            progress = Number((currentChunk / chunks).toFixed(3))
            if (progressFn && typeof progressFn === 'function') {
                progressFn(progress)
            }
            if (currentChunk < chunks) {
                loadNext();
            } else {
                resolve(spark.end())
            }
        };

        fileReader.onerror = function () {
            reject('hash fail')
            console.warn('oops, something went wrong.');
        };

        function loadNext() {
            const start = currentChunk * chunkSize,
                end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
        }

        loadNext();
    })
}
