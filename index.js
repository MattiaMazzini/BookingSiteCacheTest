'use strict';

const Hapi = require('@hapi/hapi');

const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    await server.register(require('@hapi/inert'));

    server.route([{
        method: 'GET',
        path: '/',
        handler: (request, h) => {

            return '<h1>Home</h1>'
                    +'<a href="/etag">last modified</a><br/>'
                    +'<a href="/image1">image 1</a>';
        }
    },
    {
        method: 'GET',
        path: '/etag',
        handler: (request, h) => {

            const result = '<h1>eTag</h1>'
                            +'Cache-control: { maxAge = 30 , must-revalidate , private}<br/>'
                            +'Utilizzo di ETag header<br/>'
                            +'<img src="http://localhost:3000/image1.jpg" />';

            const eTag = result.charAt(result.length-1) + result.charAt(result.length / 2) + result.charAt(result.length / 4) + result.charAt(result.length / 8) + result.charAt(result.length / 16) + result.charAt(result.length / 32);

            const response = h.response(result);

            return response.etag(eTag);
        },
        options: {
            cache: {
                expiresIn: 30 * 1000,
                privacy: 'public'
            }
        }
    },
    {
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
    }]);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();