(function () {
    'use strict';

    var ID = 'anitube_lampa_plugin';
    var VERSION = '0.2.0';
    var BASE = 'https://anitube.in.ua/';
    var LIST = 'anitube_lampa_list';
    var DETAIL = 'anitube_lampa_detail';
    var STYLE = 'anitube-lampa-v020-style';

    if (window[ID]) return;
    window[ID] = true;

    function esc(value) {
        return String(value || '').replace(/[&<>"]/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
        });
    }

    function absolute(url) {
        if (!url) return '';
        try { return new URL(url, BASE).href; } catch (e) { return ''; }
    }

    function addStyle() {
        if (document.getElementById(STYLE)) return;
        var css = ''
            + '.atl-wrap{padding:1.2em;color:#fff;min-height:70vh;box-sizing:border-box;}'
            + '.atl-head{display:flex;align-items:center;gap:.8em;flex-wrap:wrap;margin-bottom:1em;}'
            + '.atl-title{font-size:1.5em;font-weight:600;margin-right:auto;}'
            + '.atl-search{display:flex;gap:.5em;width:100%;margin:.6em 0 1em;}'
            + '.atl-search input{min-width:0;flex:1;background:#202630;color:#fff;border:1px solid #48515e;border-radius:.3em;padding:.8em;font-size:1em;}'
            + '.atl-button{background:#263746;color:#fff;border:1px solid #526273;border-radius:.3em;padding:.7em 1em;font-size:1em;}'
            + '.atl-grid{display:flex;flex-wrap:wrap;gap:1em;}'
            + '.atl-card{flex:0 0 10em;max-width:14em;min-width:0;background:#1b222c;border-radius:.45em;overflow:hidden;}'
            + '.atl-card .atl-poster{width:100%;height:14em;object-fit:cover;background:#303844;display:block;}'
            + '.atl-card .atl-name{padding:.7em;font-size:1em;line-height:1.35;min-height:3.8em;}'
            + '.atl-card.selector.focus,.atl-button.selector.focus{outline:3px solid #20c6bd;outline-offset:2px;}'
            + '.atl-status{padding:1.2em;color:#c8d0da;line-height:1.5;}'
            + '.atl-meta{color:#b9c4d0;line-height:1.6;margin:.8em 0;}'
            + '.atl-detail{max-width:60em;}'
            + '.atl-detail img{max-width:13em;max-height:19em;object-fit:contain;float:left;margin:0 1em 1em 0;}'
            + '.atl-actions{display:flex;gap:.7em;flex-wrap:wrap;margin-top:1.2em;}'
            + '.atl-clear{clear:both;}';
        var style = document.createElement('style');
        style.id = STYLE;
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function requestPage(url, success, failure, network) {
        network.native(url, function (html) {
            success(String(html || ''));
        }, function (xhr, error) {
            var message = network.errorDecode ? network.errorDecode(xhr, error) : 'Помилка мережі';
            failure(message || 'Не вдалося завантажити AniTube');
        }, null, { dataType: 'text', timeout: 20000 });
    }

    function parseCards(html) {
        var doc = document.createElement('div');
        doc.innerHTML = html;
        var found = [];
        var seen = {};
        var anchors = doc.querySelectorAll('a[href]');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var href = absolute(a.getAttribute('href'));
            var title = (a.getAttribute('title') || a.textContent || '').replace(/\s+/g, ' ').trim();
            if (!href || !/anitube\.in\.ua\//i.test(href) || !/\.html(?:$|[?#])/i.test(href) || title.length < 2) continue;
            if (seen[href]) continue;

            var node = a;
            var img = null;
            for (var depth = 0; depth < 5 && node; depth++, node = node.parentElement) {
                img = node.querySelector && node.querySelector('img');
                if (img) break;
            }
            var image = img ? absolute(img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src')) : '';
            if (image && /blank|spacer|pixel/i.test(image)) image = '';
            seen[href] = true;
            found.push({ title: title, url: href, image: image });
        }
        return found;
    }

    function parseNext(html, currentUrl) {
        var doc = document.createElement('div');
        doc.innerHTML = html;
        var links = doc.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            var label = (links[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            var rel = (links[i].getAttribute('rel') || '').toLowerCase();
            if (rel === 'next' || label === 'наступна' || label === 'next' || label === '»') {
                var next = absolute(links[i].getAttribute('href'));
                if (next && next !== currentUrl) return next;
            }
        }
        return '';
    }

    function ListScreen(object) {
        var self = this;
        var net = new Lampa.Reguest();
        var root = $('<div class="atl-wrap"><div class="atl-head"><div class="atl-title">AniTube</div><button class="atl-button selector atl-refresh">Оновити</button></div><form class="atl-search"><input class="atl-query" type="text" placeholder="Знайти аніме…"><button class="atl-button" type="submit">Пошук</button></form><div class="atl-status">Завантаження каталогу AniTube…</div><div class="atl-grid"></div><div class="atl-actions"></div></div>');
        var grid = root.find('.atl-grid');
        var status = root.find('.atl-status');
        var query = object.search || '';
        var currentUrl = object.sourceUrl || BASE;
        var nextUrl = '';

        function showError(message) {
            status.text('Не вдалося завантажити каталог: ' + message + '. Перевірте інтернет і спробуйте ще раз.');
        }

        function render(items) {
            grid.empty();
            if (!items.length) {
                status.text('На цій сторінці не знайдено карток аніме. Можливо, змінилася структура сайту.');
                return;
            }
            status.text('Знайдено елементів: ' + items.length);
            items.forEach(function (item) {
                var card = $('<div class="atl-card selector"><img class="atl-poster" alt=""><div class="atl-name"></div></div>');
                card.find('.atl-name').text(item.title);
                if (item.image) card.find('img').attr('src', item.image);
                card.on('hover:enter', function () {
                    Lampa.Activity.push({ url: item.url, title: item.title, component: DETAIL, page: 1, item: item });
                });
                grid.append(card);
            });
        }

        function load(url) {
            currentUrl = url;
            nextUrl = '';
            status.text('Завантаження каталогу AniTube…');
            grid.empty();
            root.find('.atl-actions').empty();
            requestPage(url, function (html) {
                var items = parseCards(html);
                nextUrl = parseNext(html, url);
                render(items);
                if (nextUrl) {
                    var more = $('<button class="atl-button selector">Наступна сторінка</button>');
                    more.on('hover:enter', function () { load(nextUrl); });
                    root.find('.atl-actions').append(more);
                }
            }, showError, net);
        }

        root.find('.atl-search').on('submit', function (event) {
            event.preventDefault();
            var value = root.find('.atl-query').val().trim();
            if (!value) { load(BASE); return; }
            var url = BASE + '?do=search&subaction=search&story=' + encodeURIComponent(value);
            Lampa.Activity.push({ url: url, title: 'Пошук: ' + value, component: LIST, page: 1, sourceUrl: url, search: value });
        });
        root.find('.atl-refresh').on('hover:enter', function () { load(currentUrl); });
        this.create = function () { load(currentUrl); return root; };
        this.render = function () { return root; };
        this.destroy = function () { net.clear(); root.remove(); };
    }

    function DetailScreen(object) {
        var net = new Lampa.Reguest();
        var item = object.item || { title: object.title, url: object.url };
        var root = $('<div class="atl-wrap atl-detail"><div class="atl-title"></div><div class="atl-status">Завантаження інформації…</div><div class="atl-meta"></div><div class="atl-actions"><button class="atl-button selector atl-open">Відкрити сторінку AniTube</button></div><div class="atl-clear"></div></div>');
        root.find('.atl-title').text(item.title || 'AniTube');
        root.find('.atl-open').on('hover:enter', function () {
            if (window.Lampa && Lampa.Browser && Lampa.Browser.open) Lampa.Browser.open(item.url);
            else window.open(item.url, '_blank');
        });
        this.create = function () {
            requestPage(item.url, function (html) {
                var doc = document.createElement('div');
                doc.innerHTML = html;
                var title = doc.querySelector('h1') || doc.querySelector('.title');
                var image = doc.querySelector('.fullstory img, .full-story img, .news img, article img');
                var text = doc.querySelector('.fullstory, .full-story, .news, article');
                if (image) root.find('.atl-title').before($('<img>').attr('src', absolute(image.getAttribute('src') || image.getAttribute('data-src'))));
                if (title && title.textContent.trim()) root.find('.atl-title').text(title.textContent.trim());
                if (text) root.find('.atl-meta').text(text.textContent.replace(/\s+/g, ' ').trim().slice(0, 1800));
                root.find('.atl-status').text('Сторінку аніме завантажено. Для перегляду відкрийте її на AniTube. Інтеграцію серій та програвача буде додано в наступних версіях.');
            }, function (message) {
                root.find('.atl-status').text('Не вдалося завантажити сторінку: ' + message);
            }, net);
            return root;
        };
        this.render = function () { return root; };
        this.destroy = function () { net.clear(); root.remove(); };
    }

    function addMenu() {
        if ($('.atl-menu-item').length) return;
        var item = $('<li class="menu__item selector atl-menu-item"><div class="menu__ico"><svg viewBox="0 0 44 44"><rect x="2" y="2" width="40" height="40" rx="9" fill="currentColor" opacity=".16"/><path d="M13 12h18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m19 17 10 7-10 7V17Z" fill="currentColor"/></svg></div><div class="menu__text">AniTube</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: 'AniTube', component: LIST, page: 1, sourceUrl: BASE });
        });
        $('.menu .menu__list').eq(0).append(item);
    }

    function init() {
        if (!window.Lampa || !Lampa.Component || !Lampa.Activity || !Lampa.Reguest) return;
        addStyle();
        if (!Lampa.Component.get(LIST)) Lampa.Component.add(LIST, ListScreen);
        if (!Lampa.Component.get(DETAIL)) Lampa.Component.add(DETAIL, DetailScreen);
        addMenu();
        Lampa.Listener.follow('menu', function (event) { if (event.type === 'open') addMenu(); });
        console.log('[AniTube Lampa] version ' + VERSION + ' initialized');
    }

    if (window.appready) init();
    else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') init();
    });
}());
