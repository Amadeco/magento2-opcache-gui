var config = {
    paths: {
        react: 'Amadeco_OpcacheGui/js/vendor/react.min',
        'react-dom': 'Amadeco_OpcacheGui/js/vendor/react-dom.min',
        'react-dom/client': 'Amadeco_OpcacheGui/js/vendor/react-dom-client.min',
        axios: 'Amadeco_OpcacheGui/js/vendor/axios.min',
        'amadeco/opcache-gui': 'Amadeco_OpcacheGui/js/gui'
    },
    shim: {
        react: {
            exports: 'React'
        },
        'react-dom': {
            exports: 'ReactDOM'
        },
        'react-dom/client': {
            deps: ['react-dom'],
            exports: 'ReactDOMClient'
        }
    }
};