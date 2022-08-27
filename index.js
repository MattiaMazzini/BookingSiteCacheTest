'use strict';

const Hapi = require('@hapi/hapi');
const { response } = require('@hapi/hapi/lib/validation');
const CatboxRedis = require('@hapi/catbox-redis');
const Hoek = require('@hapi/hoek');

const init = async () => {

    const expTime = 10;
    const privacy = 'private';

    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
        cache: [
            {
                name: 'my_cache',
                provider: {
                    constructor: CatboxRedis,
                    options: {
                        partition : 'my_cached_data',
                    }
                }
            }
        ]
    });

    //Funzione somma del server che useremo per testare se il caching funziona correttamente
    const add = async (a , b) => {
        await Hoek.wait(1000);

        return await Number(a) + Number(b);
    };

    
    const sumCache = server.cache({
        cache: 'my_cache',
        expiresIn: 10 * 1000,
        segment: 'customSegment',
        generateFunc: async (id) => {

            return await add(id.a, id.b);
        },
        generateTimeout: 2000
    });



    await server.register(require('@hapi/inert'));

    server.route([{
        method: 'GET',
        path: '/',
        handler: (request, h) => {

            return '<h1>Home</h1>'
                    +'<a href="/etag">e-tag</a><br/>'
                    +'<a href="/last-modified">last-modified</a><br/>'
                    +'<a href="/image1">image 1</a>';
        }
    },
    {
        //ETAG route
        method: 'GET',
        path: '/etag',
        handler: (request, h) => {

            const result = '<h1>eTag</h1>'
                            +`Cache-control: { maxAge = ${expTime} , must-revalidate , ${privacy} }<br/><br/>`
                            +'Utilizzo di ETag header<br/>';

            //Etag demo generato dinamicamente a partire dalla stringa result
            const eTag = result.charAt(result.length-1) + result.charAt(result.length / 2) + result.charAt(result.length / 4) + result.charAt(result.length / 8) + result.charAt(result.length / 16) + result.charAt(result.length / 32);

            return h.response(result).etag(eTag);
        },
        options: {
            cache: {
                expiresIn: expTime * 1000,
                privacy: privacy
            }
        }
    },
    {
        //LAST-MODIFIED route
        method: 'GET',
        path: '/last-modified/{date?}',
        handler: (request, h) => {

            const lastModified = request.params.date ? new Date(request.params.date) : new Date(2022, 8, 26, 18, 4);

            const result = `<h1>Last-Modified</h1><br/>`
                            +`Questa pagina usa una client-side cache configurata come segue, abbinato all'header Last-Modified<br/>`
                            +`Cache-control: { maxAge = ${expTime} , must-revalidate , ${privacy} }<br/><br/>`
                            +`Last-Modified = ${lastModified.toUTCString()}<br/><br/>`
                            +'Il valore di Last-Modified è modificabile attraverso i parametri della richiesta GET (es. /last-modified/yyyy-mm-dd )';

            return h.response(result).header('Last-Modified', lastModified.toUTCString());

        },
        options: {
            cache: {
                expiresIn: expTime * 1000,
                privacy: privacy
            }
        }
    },
    {
        //IMAGE1 route
        method: 'GET',
        path: '/image1',
        handler: (request, h) => {

            //const etag = '4k-img-ver2';

            return h.file('./public/image1.jpg');
        },
        options: {
            cache: {
                expiresIn: 10 * 1000,
                privacy: 'public'
            }
        }
    },
    {
        path: '/add/{a}/{b}',
        method: 'GET',
        handler: async function (request, h) {

            const { a, b } = request.params;
            const id = `${a}:${b}`;

            return await sumCache.get({ id, a, b });
        }
    }]);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();