const cheerio = require('cheerio');
const axios = require('../../utils/axios');
const url = require('url');

module.exports = async (ctx) => {
    const host = 'http://m.ngchina.com.cn';
    const response = await axios({
        method: 'get',
        url: host,
        headers: {
            Referer: host,
        },
    });
    const html = response.data;
    const $ = cheerio.load(html);
    const list = $('.ajax_list dl').get();
    const result = await process(host, list, ctx.cache);
    ctx.state.data = {
        title: '国家地理中文网',
        link: host,
        description: $('meta[name="description"]').attr('content'),
        item: result,
    };
};

async function process(host, items, cache) {
    return await Promise.all(
        items.map(async (item) => {
            const $ = cheerio.load(item);
            const $fa = $('dd a').first();
            const itemUrl = url.resolve(host, $fa.attr('href'));
            const data = {
                title: $('dt a').text(),
                link: itemUrl,
                guid: itemUrl,
                author: '国家地理中文网',
            };
            const other = await cache.tryGet(itemUrl, async () => await load(itemUrl));
            return Promise.resolve(Object.assign({}, data, other));
        })
    );
}

async function load(itemUrl) {
    const resp = await axios.get(itemUrl);
    const $ = cheerio.load(resp.data);
    const date = new Date(
        $('.detail_tag .r_float')
            .text()
            .match(/\d{4}-\d{2}-\d{2}/)
    );
    const timeZone = 8;
    const serverOffset = date.getTimezoneOffset() / 60;
    const pubDate = new Date(date.getTime() - 60 * 60 * 1000 * (timeZone + serverOffset)).toUTCString();
    const description = $('.detail_text_main').html();
    return { pubDate, description };
}
