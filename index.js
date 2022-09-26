// 用于发送http请求
const https = require('https')
const http = require('http')
// 用于提取网页中的img标签
const cheerio = require('cheerio')
// 用于将http响应中的数据写到文件中
const fs = require('fs')
// 用于获取系统文件分隔符
const path = require('path')
const sep = path.sep
// 用于存储图片和网页的文件夹路径
const imgDir = `${__dirname}${sep}images${sep}`
const pageDir = `${__dirname}${sep}pages${sep}`
// https协议名
const HTTPS = 'https:'
// 基于HTTP封装的请求库
const request = require('request');
// 用于获取url
const URLS = require('url');

// 若文件夹不存在则创建
for (const dir of [imgDir, pageDir]) {
    if (!fs.existsSync(dir)) {
        console.log('文件夹(%s)不存在,即将为您创建', dir)
        fs.mkdirSync(dir)
    }
}

// let websiteUrl = 'https://www.w3cschool.cn/'
// let websiteUrl = 'https://www.fashioneditorials.com/'
// let websiteUrl = 'https://www.fashioneditorials.com/robbie-fimmano-marie-claire-tilly-main/'
// let websiteUrl = 'https://en.acmedelavie.com/category/%EC%8B%A0%EC%83%81%ED%92%88/50/?page=1'
// let websiteUrl = 'https://en.acmedelavie.com/category/products/49/?page=1'
let websiteUrl = 'https://chuumade.com/collections/all?page=1'
// let websiteUrl = 'https://www.jacquemus.com/en_fr/le-papier-new-arrivals-women'
// let websiteUrl = 'http://image.so.com/i?q=%E7%8C%AB&src=tab_www'


// 下载中的图片数量
let downloadingCount = 0
// 当前下载的页数
// let page = 1
// console.log(URLS.parse(websiteUrl, true).query.page)  // URL.parse 的第二个参数为 true 时会以对象形式显示，方便获取里面的 page 参数
let page = URLS.parse(websiteUrl, true).query.page  // 如果 url 参数中存在page这个参数，则代表该 url 支持分页查询，这样每获取完一页就+1爬取下一页图片

// 储存已经下载过的图片名称
let downloadList = new Set()

// 执行主入口
downloadImgsOn(websiteUrl)

// 下载指定网站包含的图片
/*function downloadImgsOn(url) {
    // URL作为options
    const options = new URL(url);
    // 获取协议
    const protocol = options.protocol
    // 根据协议选择发送请求的模块
    const _http = protocol === HTTPS ? https : http
    // 发送请求
    const req = _http.request(options, (res) => {
        // 用于存储返回的html数据
        let htmlData = ''
        res.on('data', (chunk) => {
            // console.log('chunk', chunk.toString('utf8'))
            htmlData += chunk.toString('utf8')
        })

        res.on('end', () => {
            // 将html数据存储到文件中,可用于人工校验
            const htmlFileName = `${pageDir}result.html`
            fs.writeFile(htmlFileName, htmlData, () => {
                console.log('页面(%s)读取完毕,已保存至(%s)', url, htmlFileName)
            })

            // 将html信息转换为类jq对象
            const $ = cheerio.load(htmlData)
            const imgs = $('img')
            console.log(imgs.length)

            // 用于保存需要下载的图片url,去除重复的图片url
            const imgUrlSet = new Set()
            imgs.each((index, img) => {
                // 获取图片url
                let imgUrl = img.attribs.src
                // 将不完整的图片url转完成完整的图片url
                if (imgUrl.startsWith('//')) {
                    imgUrl = protocol + imgUrl
                } else if (imgUrl.startsWith('/')) {
                    imgUrl = url + imgUrl
                }
                imgUrlSet.add(imgUrl)
            })

            console.log('获取图片url共%s个', imgUrlSet.size)
            // 下载imgUrlSet中包含的图片
            for (const imgUrl of imgUrlSet) {
                downloadImg(imgUrl)
            }
        })
    })

    req.on('error', (err) => {
        console.error(err)
    })

    req.end();
}*/

/**
 * 新版下载指定网站包含的图片
 * @param url  网站url
 * @param isRepeat 是否进行去重判断
 */
function downloadImgsOn(url, isRepeat = false) {
    request({
        url: url,
        // 新增请求头
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
        }
    }, function(err, res, body) {
        // console.log(res.statusCode)
        // console.log(body)
        if(!err && res.statusCode === 200) {
            // URL作为options
            const options = new URL(url);
            // 获取协议
            const protocol = options.protocol

            // 用于存储返回的html数据
            let htmlData = body.toString('utf8')

            // 将html信息转换为类jq对象
            const $ = cheerio.load(body);
            const imgs = $('img')  // 查找到页面所有的img标签，相当于模糊查找
            // console.log(imgs.length)
            // const imgs = $('.ec-product-listwishicon')  // 查找到页面所有class为ec-product-listwishicon的标签，更加精确的查找

            // 如果找不到就直接返回
            if (imgs.length == 0) {
                return
            }

            // 最大页数，读取当前网站的ol列表下的li标签数量
            // const maxPage = $('ol').find('li').length
            let maxPage = 1

            // 获取 https://en.acmedelavie.com 网站的分页
            // 每次都会循环，消耗性能
            /*$('ol').children().each((i, e)=>{
                maxPage = Number($(e).text().trim());
            });*/
            // Number($('ol').children().last().text().trim()) ? maxPage = Number($('ol').children().last().text().trim()) : 1 // 直接获取最后一个，优化性能

            // 获取 https://chuumade.com 网站的分页
            Number($('.page-number').last().text().trim()) ? maxPage = Number($('.page-number').last().text().trim()) : 1 // 直接获取最后一个，优化性能

            // console.log(maxPage)

            // 如果当前页大于分页页数，就返回
            if (page && page > maxPage) {
                return
            }

            // 将html数据存储到文件中,可用于人工校验
            const htmlFileName = `${pageDir}result.html`
            fs.writeFile(htmlFileName, htmlData, () => {
                console.log('页面(%s)读取完毕,已保存至(%s)', url, htmlFileName)
            })

            // 用于保存需要下载的图片url,去除重复的图片url
            const imgUrlSet = new Set()
            imgs.each((index, img) => {
                // 获取图片url
                if(img.attribs.src) {
                    let imgUrl = img.attribs.src
                    // 将不完整的图片url转完成完整的图片url
                    if (imgUrl.startsWith('//')) {
                        imgUrl = protocol + imgUrl
                    } else if (imgUrl.startsWith('/')) {
                        imgUrl = url + imgUrl
                    }
                    imgUrlSet.add(imgUrl)
                }

                // 获取鼠标移入事件更换所的图片url（商品背面图）
                if(img.attribs.onmouseover) {
                    // 由于商品背面图是使用 onmouseover 事件触发，所以直接获取 onmouseover 是一个function (格式为：this.src='//en.acmedelavie.com/web/product/small/202209/d3088b9d29686b60e2ae3fecde62f257.jpg')，所以我们使用 .replace("this.src='", '').replace("'", '') 来替换掉不可用部分
                    let backImgUrl = img.attribs.onmouseover.replace("this.src='", '').replace("'", '');
                    // 将不完整的图片url转完成完整的图片url
                    if (backImgUrl.startsWith('//')) {
                        backImgUrl = protocol + backImgUrl
                    } else if (backImgUrl.startsWith('/')) {
                        backImgUrl = url + backImgUrl
                    }
                    imgUrlSet.add(backImgUrl)
                }
            })

            // console.log(downloadList)
            // console.log(imgUrlSet)
            // 从已下载的图片中判断是否已下载
            if (isRepeat) {
                for (const imgUrl of imgUrlSet) {
                    if (downloadList.has(imgUrl)) {
                        imgUrlSet.delete(imgUrl)
                    }
                }

                // console.log(imgUrlSet)
                // 如果去重后需要下载的为 0 就直接返回
                if (imgUrlSet.size == 0) {
                    return
                }
            }

            console.log('获取图片url共%s个', imgUrlSet.size)
            // 下载imgUrlSet中包含的图片
            for (const imgUrl of imgUrlSet) {
                downloadList.add(imgUrl) // 在已下载的图片记录中追加当前图片名称
                downloadImg(imgUrl) // 执行下载图片操作
            }

            // 如果支持分页，则递归执行
            if(page) {
                page ++
                // console.log(options)
                options.searchParams.set('page', page) // 重新设置页数
                // console.log(options.href)
                websiteUrl = options.href
                // console.log(websiteUrl)
                // return page && imgs.length > 0 ? downloadImgsOn(websiteUrl, true) : ''  // 重复累赘的判断

                // 递归
                downloadImgsOn(websiteUrl, true)
            }
        } else {
            console.log('请求发生错误！！！！！！！！！！')
        }
    })
}

/**
 * 打印当前正在下载的图片数
 */
function printDownloadingCount() {
    console.log('当前下载中的图片有%s个', downloadingCount)
}

/**
 * 下载指定url对应的图片
 * @param {*} imgUrl 目标图片url
 * @param {*} maxRetry 下载失败重试次数
 * @param {*} timeout 超时时间毫秒数
 */
function downloadImg(imgUrl, maxRetry = 1, timeout = 5000) {
    /**
     * 用于下载失败后重试
     */
    function retry() {
        if (maxRetry) {
            console.log('(%s)剩余重试次数:%s,即将重试', imgUrl, maxRetry);
            downloadImg(imgUrl, maxRetry - 1);
        } else {
            console.log('(%s)下载彻底失败', imgUrl)
        }
    }

    // URL作为options
    const options = new URL(imgUrl);
    // 根据协议选择发送请求的模块
    const _http = options.protocol === HTTPS ? https : http

    // 从url中提取文件名
    const matches = imgUrl.match(/(?<=.*\/)[^\/\?]+(?=\?|$)/)
    const fileName = matches && matches[0]

    // 请求关闭时是否需要重新请求
    let retryFlag = false
    const req = _http.request(options, (res) => {
        console.log('开始下载图片(%s)', imgUrl)
        downloadingCount += 1
        printDownloadingCount()

        // 判断数据是否为图片类型,仅保存图片类型
        const contentType = res.headers['content-type']

        if (contentType.startsWith('image')) {
            // 存储图片数据到内存中
            const chunks = []
            res.on('data', (chunk) => {
                chunks.push(chunk)
            })

            // req.on('abort') 中相同的操作也可以写在 res.on('aborted') 中
            // res.on('aborted', () => {})
            res.on('end', () => {
                downloadingCount -= 1
                printDownloadingCount()

                // 若响应正常结束,将内存中的数据写入到文件中
                if (res.complete) {
                    console.log('图片(%s)下载完成', imgUrl)
                    write(imgDir + fileName, chunks, 0)
                } else {
                    console.log('(%s)下载结束但未完成', imgUrl)
                }
            })
        }
    })

    req.on('error', (err) => {
        console.error(err)
        retryFlag = true
    })

    req.on('abort', () => {
        console.log('下载(%s)被中断', imgUrl)
        retryFlag = true
    })

    req.on('close', () => {
        if (retryFlag) {
            retry()
        }
    })

    // 如果超时则中止当前请求
    req.setTimeout(timeout, () => {
        console.log('下载(%s)超时', imgUrl)
        req.abort()
    })
    req.end()
}

/**
 * 将数据块数组chunks中第index个数据块写入到distFileName对应文件的末尾
 * @param {*} distFileName 数据将写入的文件名
 * @param {*} chunks 图片数据块数组
 * @param {*} index 写入数据块的索引
 */
function write(distFileName, chunks, index) {
    if (index === 0) {
        let i = 0

        // 判断文件是否重名,若重名则重新生成带序号的文件名
        let tmpFileName = distFileName
        while (fs.existsSync(tmpFileName)) {
            tmpFileName = distFileName.replace(new RegExp(`^(.*?)([^${sep}\\.]+)(\\..*|$)`), `$1$2_${i}$3`)
            i += 1
        }
        distFileName = tmpFileName
    }

    // 获取图片数据块依次写入文件
    const chunk = chunks[index]

    if (chunk) {
        // 异步、递归
        fs.appendFile(distFileName, chunk, (err) => {
            if (err) {
                console.log(err);
            }
            write(distFileName, chunks, index + 1)
        })
    } else {
        console.log('文件(%s)写入完毕', distFileName)
    }
}



/*
let fs = require('fs');//引入文件读取模块
let request = require('request')


/!* 读取 imageUrlData 文件夹中所有地址并且下载到 images 文件夹中 *!/
let list = fs.readdirSync('./imageUrlData')
// console.log(list)

list.forEach(file => {
    let contentText = fs.readFileSync(`./imageUrlData/${file}`,'utf-8');
    // console.log(contentText)

    let arr = []
    contentText =  contentText.replace(/http[s]?:\/\/.+\.(jpg|gif|png)/g, res => {
        let filename =  res.split('/').pop()
        arr.push(res)
        return  `.images/${filename}`
    })
    // console.log(contentText)
    // console.log(arr)

    let imgList = Array.from(new Set(arr)) // 数组去重
    // console.log(imgList)

    imgList.forEach((url,idx)=>{
        let filename =  url.split('/').pop()
        request({url}).pipe(
            fs.createWriteStream(`./images/${filename}`).on('close', err => {
                console.log('err',err)
            })
        )
    })

    // fs.writeFile(`./imageUrlData/${file}`, contentText, res => {
    //     console.log(res)
    // })
})*/
