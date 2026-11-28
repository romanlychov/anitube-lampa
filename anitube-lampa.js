(function () {
    'use strict';

    var ID = 'anitube_lampa_plugin';
    var VERSION = '0.2.8';
    var BASE = 'https://anitube.in.ua/';
    var FENIX = 'https://fenixplay.xyz/';
    var LIST = 'anitube_lampa_list';
    var DETAIL = 'anitube_lampa_detail';
    var STYLE = 'anitube-lampa-v028-style';

    if (window[ID]) return;
    window[ID] = true;

    function esc(value) {
        return String(value || '').replace(/[&<>\"]/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c];
        });
    }

    function absolute(url, base) {
        if (!url) return '';
        try { return new URL(url, base || BASE).href; } catch (e) { return ''; }
    }

    function addStyle() {
        if (document.getElementById(STYLE)) return;
        var css = ''
            + '.atl-wrap{padding:1.2em 1.5em 3em;color:#fff;box-sizing:border-box;min-height:70vh;}'
            + '.atl-head{display:flex;align-items:center;gap:.8em;flex-wrap:wrap;margin-bottom:1em;}'
            + '.atl-title{font-size:1.5em;font-weight:600;margin-right:auto;}'
            + '.atl-search{display:flex;gap:.5em;width:100%;margin:.6em 0 1em;}'
            + '.atl-search input.selector{min-width:0;flex:1;background:#202630;color:#fff;border:1px solid #48515e;border-radius:.3em;padding:.8em;font-size:1em;}'
            + '.atl-button{background:#263746;color:#fff;border:1px solid #526273;border-radius:.3em;padding:.7em 1em;font-size:1em;}'
            + '.atl-grid{display:flex;flex-wrap:wrap;gap:1em;}'
            + '.atl-card{flex:0 0 10em;max-width:14em;min-width:0;background:#1b222c;border-radius:.45em;overflow:hidden;}'
            + '.atl-card .atl-poster{width:100%;height:14em;object-fit:cover;background:#303844;display:block;}'
            + '.atl-card .atl-poster.atl-missing{visibility:hidden;}'
            + '.atl-card .atl-name{padding:.7em;font-size:1em;line-height:1.35;min-height:3.8em;}'
            + '.atl-card.selector.focus,.atl-button.selector.focus,.atl-query.selector.focus{outline:3px solid #20c6bd;outline-offset:2px;}'
            + '.atl-card.selector.focus{transform:scale(1.025);}'
            + '.atl-status{padding:1em 0;color:#c8d0da;line-height:1.5;}'
            + '.atl-meta{color:#b9c4d0;line-height:1.6;margin:.8em 0;white-space:normal;}'
            + '.atl-detail img{max-width:13em;max-height:19em;object-fit:contain;float:left;margin:0 1em 1em 0;}'
            + '.atl-actions{display:flex;gap:.7em;flex-wrap:wrap;margin-top:1.2em;}'
            + '.atl-episode{display:block;width:100%;text-align:left;margin:.35em 0;background:#202a35;color:#fff;border:1px solid #465565;border-radius:.35em;padding:.85em;}'
            + '.atl-clear{clear:both;}';
        var style = document.createElement('style');
        style.id = STYLE;
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function requestText(network, url, success, failure, headers) {
        network.native(url, function (data) {
            success(String(data || ''));
        }, function (xhr, error) {
            var message = network.errorDecode ? network.errorDecode(xhr, error) : 'Помилка мережі';
            failure(message || 'Не вдалося завантажити сторінку');
        }, null, { dataType: 'text', timeout: 25000, headers: headers || {} });
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
            var image = '';
            var bestScore = -1;
            for (var depth = 0; depth < 6 && node; depth++, node = node.parentElement) {
                if (!node.querySelectorAll) continue;
                var imgs = node.querySelectorAll('img');
                for (var j = 0; j < imgs.length; j++) {
                    var candidate = imgs[j];
                    var attrs = [
                        candidate.getAttribute('data-original'), candidate.getAttribute('data-src'),
                        candidate.getAttribute('data-lazy-src'), candidate.getAttribute('data-original-src'),
                        candidate.getAttribute('data-image'), candidate.getAttribute('src'),
                        candidate.getAttribute('data-srcset'), candidate.getAttribute('srcset')
                    ];
                    var raw = '';
                    for (var k = 0; k < attrs.length; k++) {
                        if (attrs[k]) {
                            raw = attrs[k].split(',')[0].trim().split(/\s+/)[0];
                            if (raw) break;
                        }
                    }
                    var candidateUrl = absolute(raw);
                    if (!candidateUrl || /blank|spacer|pixel|logo|avatar|icon/i.test(candidateUrl)) continue;
                    var className = String(candidate.className || '').toLowerCase();
                    var score = 10 - depth;
                    if (/poster|cover|thumb|preview|image|photo/i.test(className)) score += 20;
                    if (candidate.getAttribute('data-original') || candidate.getAttribute('data-src')) score += 5;
                    if (candidate.naturalWidth > 100 || candidate.width > 100) score += 5;
                    if (score > bestScore) { bestScore = score; image = candidateUrl; }
                }
                if (!image && node.getAttribute && node.getAttribute('style')) {
                    var bg = node.getAttribute('style').match(/background-image\s*:\s*url\(([^)]+)\)/i);
                    if (bg && bg[1]) image = absolute(bg[1].replace(/^['\"]|['\"]$/g, '').trim());
                }
            }
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

    function decodeJwtPayload(url) {
        var match = String(url || '').match(/\/vod\/([^/?#]+)/);
        if (!match) return null;
        var parts = match[1].split('.');
        if (parts.length < 2) return null;
        try {
            var raw = parts[0].replace(/-/g, '+').replace(/_/g, '/');
            while (raw.length % 4) raw += '=';
            var binary = atob(raw);
            var bytes = [];
            for (var i = 0; i < binary.length; i++) bytes.push('%' + ('00' + binary.charCodeAt(i).toString(16)).slice(-2));
            return JSON.parse(decodeURIComponent(bytes.join('')));
        } catch (e) { return null; }
    }

    function extractVod(html) {
        var doc = document.createElement('div');
        doc.innerHTML = html;
        var nodes = doc.querySelectorAll('iframe[src], source[src], a[href], [data-src], [data-file], [data-url]');
        for (var i = 0; i < nodes.length; i++) {
            var value = nodes[i].getAttribute('src') || nodes[i].getAttribute('href') ||
                nodes[i].getAttribute('data-src') || nodes[i].getAttribute('data-file') ||
                nodes[i].getAttribute('data-url') || '';
            value = absolute(value, BASE).replace(/&amp;/g, '&');
            if (/fenixplay\.xyz\/vod\//i.test(value)) return value;
        }
        var match = html.match(/https?:\\?\/\\?\/fenixplay\.xyz\\?\/vod\\?\/[A-Za-z0-9._%-]+/i) ||
            html.match(/https?:\/\/fenixplay\.xyz\/vod\/[A-Za-z0-9._%-]+/i);
        return match ? match[0].replace(/\\\//g, '/').replace(/&amp;/g, '&') : '';
    }

    function extractPlaybackToken(html) {
        var patterns = [
            /(?:X-Fenix-Playback|playback_token|playbackToken|index_token|indexToken|fenixPlaybackToken)\s*["']?\s*[:=]\s*["']([A-Za-z0-9._-]{80,})["']/i,
            /["'](?:X-Fenix-Playback|playback_token|playbackToken|index_token|indexToken)["']\s*:\s*["']([A-Za-z0-9._-]{80,})["']/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = html.match(patterns[i]);
            if (match && match[1]) return match[1];
        }
        return '';
    }

    function showNotice(message) {
        if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message, { time: 5000 });
    }

    function ListScreen(object) {
        var self = this;
        var net = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var root = $('<div class="atl-wrap"><div class="atl-head"><div class="atl-title">AniTube</div><button type="button" class="atl-button selector atl-refresh">Оновити</button></div><form class="atl-search"><input class="atl-query selector" type="text" placeholder="Знайти аніме…" readonly><button class="atl-button selector atl-search-submit" type="submit">Пошук</button></form><div class="atl-status">Завантаження каталогу AniTube…</div><div class="atl-grid"></div><div class="atl-actions"></div></div>');
        var grid = root.find('.atl-grid');
        var status = root.find('.atl-status');
        var query = object.search || '';
        var currentUrl = object.sourceUrl || BASE;
        var nextUrl = '';
        var alive = true;

        scroll.append(root[0]);
        scroll.minus();

        function syncNavigation(focusFirst) {
            if (!alive) return;
            Lampa.Controller.collectionSet(scroll.render(true));
            if (focusFirst) Lampa.Controller.collectionFocus(false, scroll.render(true));
        }

        function focusScroll(element) {
            scroll.update(element);
        }

        function showError(message) {
            status.text('Не вдалося завантажити каталог: ' + message + '. Перевірте інтернет і спробуйте ще раз.');
            syncNavigation(false);
        }

        function openItem(item) {
            Lampa.Activity.push({ url: item.url, title: item.title, component: DETAIL, page: 1, item: item });
        }

        function render(items) {
            grid.empty();
            if (!items.length) {
                status.text('На цій сторінці не знайдено карток аніме. Можливо, змінилася структура сайту.');
                syncNavigation(false);
                return;
            }
            status.text('Знайдено елементів: ' + items.length);
            items.forEach(function (item) {
                var card = $('<div tabindex="0" class="atl-card selector"><img class="atl-poster" alt=""><div class="atl-name"></div></div>');
                card.find('.atl-name').text(item.title);
                if (item.image) card.find('img').attr('src', item.image).removeClass('atl-missing').on('error', function () { $(this).addClass('atl-missing'); });
                else card.find('img').addClass('atl-missing');
                card.on('hover:focus', function () { focusScroll(this); });
                card.on('hover:enter click', function () { openItem(item); });
                grid.append(card);
            });
            syncNavigation(false);
        }

        function load(url) {
            currentUrl = url;
            nextUrl = '';
            status.text('Завантаження каталогу AniTube…');
            grid.empty();
            root.find('.atl-actions').empty();
            requestText(net, url, function (html) {
                if (!alive) return;
                var items = parseCards(html);
                nextUrl = parseNext(html, url);
                render(items);
                if (nextUrl) {
                    var more = $('<button type="button" class="atl-button selector">Наступна сторінка</button>');
                    more.on('hover:focus', function () { focusScroll(this); });
                    more.on('hover:enter click', function () { load(nextUrl); });
                    root.find('.atl-actions').append(more);
                }
                syncNavigation(true);
            }, function (message) {
                if (alive) showError(message);
            });
        }

        function doSearch(event) {
            if (event && event.preventDefault) event.preventDefault();
            var value = root.find('.atl-query').val().trim();
            if (!value) { load(BASE); return; }
            var url = BASE + '?do=search&subaction=search&story=' + encodeURIComponent(value);
            Lampa.Activity.push({ url: url, title: 'Пошук: ' + value, component: LIST, page: 1, sourceUrl: url, search: value });
        }

        root.find('.atl-search').on('submit', doSearch);
        root.find('.atl-search-submit').on('hover:focus', function () { focusScroll(this); }).on('hover:enter click', doSearch);
        root.find('.atl-query').on('hover:focus', function () { focusScroll(this); }).on('hover:enter click', function () {
            var input = $(this);
            if (Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({ title: 'Пошук аніме', value: input.val(), free: true, nomic: true }, function (value) {
                    input.val(value || '');
                    doSearch();
                });
            }
        });
        root.find('.atl-refresh').on('hover:focus', function () { focusScroll(this); }).on('hover:enter click', function () { load(currentUrl); });

        this.create = function () { load(currentUrl); return scroll.render(true); };
        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () { syncNavigation(true); },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () { if (Navigator.canmove('right')) Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
            syncNavigation(false);
        };
        this.stop = function () {};
        this.render = function () { return scroll.render(true); };
        this.destroy = function () { alive = false; net.clear(); scroll.destroy(); root.remove(); };
    }

    function DetailScreen(object) {
        var net = new Lampa.Reguest();
        var item = object.item || { title: object.title, url: object.url };
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var root = $('<div class="atl-wrap atl-detail"><div class="atl-title"></div><div class="atl-status">Завантаження інформації…</div><div class="atl-meta"></div><div class="atl-actions"></div><div class="atl-episodes"></div><div class="atl-clear"></div></div>');
        var status = root.find('.atl-status');
        var actions = root.find('.atl-actions');
        var episodes = root.find('.atl-episodes');
        var alive = true;
        var vodUrls = [];
        var title = item.title || 'AniTube';
        root.find('.atl-title').text(title);
        scroll.append(root[0]);
        scroll.minus();

        function syncNavigation(focusFirst) {
            if (!alive) return;
            Lampa.Controller.collectionSet(scroll.render(true));
            if (focusFirst) Lampa.Controller.collectionFocus(false, scroll.render(true));
        }

        function focusScroll(element) { scroll.update(element); }

        function addButton(label, callback, cls) {
            var button = $('<button type="button" class="atl-button selector"></button>').text(label);
            if (cls) button.addClass(cls);
            button.on('hover:focus', function () { focusScroll(this); });
            button.on('hover:enter click', callback);
            actions.append(button);
            return button;
        }

        function addEpisode(url, label) {
            if (vodUrls.indexOf(url) >= 0) return;
            vodUrls.push(url);
            var button = $('<button type="button" class="atl-episode selector"></button>').text(label || ('Серія ' + vodUrls.length));
            button.on('hover:focus', function () { focusScroll(this); });
            button.on('hover:enter click', function () { loadVod(url); });
            episodes.append(button);
        }

        function playEpisode(data, episodeTitle) {
            var episode = data.episode || data;
            var tracks = episode.tracks || [];
            if (!tracks.length) {
                status.text('API AniTube не повернув доступних аудіодоріжок для цієї серії.');
                return;
            }
            var options = tracks.map(function (track, index) {
                return {
                    title: track.label || track.voice_studio_name || ('Озвучення ' + (index + 1)),
                    subtitle: track.track_type || '',
                    track: track
                };
            });
            function playTrack(track) {
                var url = track.cast_avc_url || track.hls_url || episode.hls_master_url || '';
                if (!url) {
                    showNotice('Для вибраної озвучки немає прямого HLS-посилання.');
                    return;
                }
                var subs = (episode.subtitles || []).filter(function (sub) {
                    return sub && sub.url && (sub.kind === 'full' || sub.kind === 'signs');
                }).map(function (sub) {
                    return { label: sub.label || sub.voice_studio_name || 'Субтитри', url: sub.url };
                });
                var playData = {
                    url: url,
                    title: title + (episodeTitle ? ' — ' + episodeTitle : ''),
                    quality: 'auto',
                    subtitles: subs,
                    movie: object.movie || null
                };
                status.text('Передаю потік до штатного програвача Lampa. Якщо з’явиться помилка мережі або формату, це означатиме, що AniTube/FenixPlay вимагає додатковий ключ доступу або окрему обробку потоку.');
                Lampa.Player.play(playData);
            }
            if (options.length === 1) playTrack(options[0].track);
            else {
                Lampa.Select.show({
                    title: 'Виберіть озвучення',
                    items: options,
                    onSelect: function (selected) {
                        Lampa.Select.close();
                        playTrack(selected.track);
                    },
                    onBack: function () { Lampa.Controller.toggle('content'); }
                });
            }
        }

        function loadEpisodeApi(payload, vodUrl) {
            if (!payload || !payload.s || !payload.e) {
                status.text('Посилання FenixPlay знайдено, але його параметри не вдалося розпізнати.');
                return;
            }
            var apiUrl = FENIX + 'api/playback/' + encodeURIComponent(payload.s) + '/episodes/' +
                encodeURIComponent(payload.v || 'tv') + '/' + encodeURIComponent(payload.e);
            var vodPage = new Lampa.Reguest();
            requestText(vodPage, vodUrl, function (vodHtml) {
                if (!alive) { vodPage.clear(); return; }
                var token = extractPlaybackToken(vodHtml);
                vodPage.clear();
                if (!token) {
                    status.text('FenixPlay відкриває сторінку програвача, але в її HTML не знайдено X-Fenix-Playback. Без цього тимчасового ключа API серій не віддає список озвучень. Пряме відкриття сайту тут вимкнено навмисно.');
                    return;
                }
                status.text('Отримую дані серії та озвучення…');
                requestText(net, apiUrl, function (raw) {
                    if (!alive) return;
                    var json;
                    try { json = JSON.parse(raw); } catch (e) { status.text('FenixPlay повернув некоректну відповідь API.'); return; }
                    if (json && json.error) { status.text('Помилка FenixPlay: ' + (json.error.message || json.error)); return; }
                    playEpisode(json, 'Серія ' + payload.e);
                }, function (message) {
                    if (alive) status.text('Не вдалося отримати серію з FenixPlay: ' + message + '. Можлива причина — CORS або вимога додаткового заголовка авторизації.');
                }, { 'X-Fenix-Playback': token });
            }, function (message) {
                if (alive) status.text('Не вдалося прочитати сторінку FenixPlay: ' + message);
                vodPage.clear();
            });
        }

        function loadVod(vodUrl) {
            var payload = decodeJwtPayload(vodUrl);
            if (!payload) {
                status.text('Не вдалося прочитати посилання на відео FenixPlay.');
                return;
            }
            status.text('Підключення до FenixPlay…');
            loadEpisodeApi(payload, vodUrl);
        }

        this.create = function () {
            requestText(net, item.url, function (html) {
                if (!alive) return;
                var doc = document.createElement('div');
                doc.innerHTML = html;
                var pageTitle = doc.querySelector('h1') || doc.querySelector('.title');
                var image = doc.querySelector('.fullstory img, .full-story img, .news img, article img');
                var text = doc.querySelector('.fullstory, .full-story, .news, article');
                if (image) root.find('.atl-title').before($('<img>').attr('src', absolute(image.getAttribute('src') || image.getAttribute('data-src'))));
                if (pageTitle && pageTitle.textContent.trim()) {
                    title = pageTitle.textContent.trim();
                    root.find('.atl-title').text(title);
                }
                if (text) root.find('.atl-meta').text(text.textContent.replace(/\s+/g, ' ').trim().slice(0, 1800));

                var nodes = doc.querySelectorAll('iframe[src], source[src], a[href], [data-src], [data-file], [data-url]');
                for (var i = 0; i < nodes.length; i++) {
                    var value = nodes[i].getAttribute('src') || nodes[i].getAttribute('href') ||
                        nodes[i].getAttribute('data-src') || nodes[i].getAttribute('data-file') ||
                        nodes[i].getAttribute('data-url') || '';
                    value = absolute(value, item.url).replace(/&amp;/g, '&');
                    if (/fenixplay\.xyz\/vod\//i.test(value)) addEpisode(value, 'Відкрити серію ' + (vodUrls.length + 1));
                }
                var vod = extractVod(html);
                if (vod) addEpisode(vod, 'Завантажити доступну серію');
                if (vodUrls.length) {
                    status.text('Сторінку аніме розібрано. Вибери серію нижче. Відтворення буде передано до програвача Lampa.');
                } else {
                    status.text('У завантаженому HTML сторінки не знайдено прямих посилань FenixPlay. Список серій може формуватися окремим запитом AniTube під час роботи сайту; цей спосіб отримання серій ще не реалізовано.');
                }
                syncNavigation(true);
            }, function (message) {
                if (alive) status.text('Не вдалося завантажити сторінку аніме: ' + message);
            });
            return scroll.render(true);
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () { syncNavigation(true); },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () { if (Navigator.canmove('right')) Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
            syncNavigation(false);
        };
        this.stop = function () {};
        this.render = function () { return scroll.render(true); };
        this.destroy = function () { alive = false; net.clear(); scroll.destroy(); root.remove(); };
    }

    function addMenu() {
        if ($('.atl-menu-item').length) return;
        var item = $('<li class="menu__item selector atl-menu-item"><div class="menu__ico"><svg viewBox="0 0 44 44"><rect x="2" y="2" width="40" height="40" rx="9" fill="currentColor" opacity=".16"/><path d="M13 12h18a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m19 17 10 7-10 7V17Z" fill="currentColor"/></svg></div><div class="menu__text">AniTube</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: 'AniTube', component: LIST, page: 1, sourceUrl: BASE });
        });
        $('.menu .menu__list').eq(0).append(item);
    }

    function registerManifest() {
        if (!Lampa.Manifest) return;
        Lampa.Manifest.plugins = {
            type: 'video',
            name: 'AniTube',
            description: 'Українське джерело аніме з AniTube',
            onContextMenu: function () {
                return { title: 'Знайти на AniTube' };
            },
            onContextLauch: function (card) {
                var search = card.title || card.name || card.original_title || card.original_name || '';
                Lampa.Activity.push({
                    url: '',
                    title: 'AniTube — ' + search,
                    component: LIST,
                    page: 1,
                    sourceUrl: BASE + '?do=search&subaction=search&story=' + encodeURIComponent(search),
                    search: search,
                    movie: card
                });
            }
        };
    }

    function init() {
        if (!window.Lampa || !Lampa.Component || !Lampa.Activity || !Lampa.Reguest) return;
        addStyle();
        if (!Lampa.Component.get(LIST)) Lampa.Component.add(LIST, ListScreen);
        if (!Lampa.Component.get(DETAIL)) Lampa.Component.add(DETAIL, DetailScreen);
        registerManifest();
        addMenu();
        Lampa.Listener.follow('menu', function (event) { if (event.type === 'open') addMenu(); });
        console.log('[AniTube Lampa] version ' + VERSION + ' initialized');
    }

    if (window.appready) init();
    else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') init();
    });
}());