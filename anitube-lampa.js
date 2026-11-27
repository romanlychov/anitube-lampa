(function () {
    'use strict';

    var PLUGIN_ID = 'anitube_lampa_plugin';
    var PLUGIN_VERSION = '0.1.0';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var SITE_URL = 'https://anitube.in.ua/';
    var COMPONENT = 'anitube_web_screen';
    var MENU_CLASS = 'anitube-lampa-menu-item';
    var STYLE_ID = 'anitube-lampa-plugin-style';

    function notify(message) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message);
    }

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;

        var css = ''
            + '.anitube-screen{position:relative;width:100%;height:100%;min-height:70vh;background:#101318;}'
            + '.anitube-screen__bar{height:3.2em;display:flex;align-items:center;padding:0 1.2em;'
            + 'background:#171c24;color:#fff;font-size:1.05em;box-sizing:border-box;}'
            + '.anitube-screen__hint{margin-left:auto;opacity:.65;font-size:.75em;}'
            + '.anitube-screen__frame{display:block;width:100%;height:calc(100% - 3.2em);border:0;background:#fff;}'
            + '.anitube-screen__error{padding:2em;color:#fff;font-size:1.1em;line-height:1.5;}'
            + '.anitube-lampa-menu-item .menu__ico svg{width:2.7em;height:2.7em;}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function AniTubeScreen(object) {
        var root;
        var frame;
        var loaded = false;

        this.create = function () {
            root = $('<div class="anitube-screen">'
                + '<div class="anitube-screen__bar">'
                + '<span>AniTube</span>'
                + '<span class="anitube-screen__hint">Керування — пультом телевізора</span>'
                + '</div>'
                + '<iframe class="anitube-screen__frame"'
                + ' src="' + SITE_URL + '"'
                + ' title="AniTube"'
                + ' allow="autoplay; fullscreen; picture-in-picture; encrypted-media"'
                + ' allowfullscreen="allowfullscreen"'
                + ' referrerpolicy="strict-origin-when-cross-origin"></iframe>'
                + '</div>');

            frame = root.find('iframe');

            frame.on('load', function () {
                loaded = true;
            });

            frame.on('error', function () {
                notify('AniTube не вдалося завантажити у вбудованому вікні.');
            });

            return root;
        };

        this.render = function () {
            return root;
        };

        this.start = function () {
            if (!loaded) notify('Завантаження AniTube…');
        };

        this.stop = function () {};

        this.pause = function () {};

        this.destroy = function () {
            if (frame) {
                frame.off();
                frame.attr('src', 'about:blank');
            }
            if (root) root.remove();
            frame = null;
            root = null;
        };
    }

    function openAniTube() {
        Lampa.Activity.push({
            url: '',
            title: 'AniTube',
            component: COMPONENT,
            page: 1
        });
    }

    function addMenuItem() {
        if ($('.' + MENU_CLASS).length) return;

        var item = $('<li class="menu__item selector ' + MENU_CLASS + '">'
            + '<div class="menu__ico">'
            + '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">'
            + '<rect x="2" y="2" width="40" height="40" rx="9" fill="currentColor" opacity=".16"/>'
            + '<path d="M13 12h18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2"/>'
            + '<path d="m19 17 10 7-10 7V17Z" fill="currentColor"/>'
            + '</svg>'
            + '</div>'
            + '<div class="menu__text">AniTube</div>'
            + '</li>');

        item.on('hover:enter', openAniTube);
        $('.menu .menu__list').eq(0).append(item);
    }

    function init() {
        if (!window.Lampa || !Lampa.Component || !Lampa.Activity) return;

        addStyle();

        if (!Lampa.Component.get(COMPONENT)) {
            Lampa.Component.add(COMPONENT, AniTubeScreen);
        }

        addMenuItem();

        Lampa.Listener.follow('menu', function (event) {
            if (event.type === 'open') addMenuItem();
        });

        console.log('[AniTube Lampa] initialized, version ' + PLUGIN_VERSION);
    }

    if (window.appready) {
        init();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
}());