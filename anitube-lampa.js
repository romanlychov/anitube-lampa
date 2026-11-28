(function () {
    'use strict';

    var ID = 'anitube_lampa_plugin';
    var VERSION = '0.2.15';
    var BASE = 'https://anitube.in.ua/';
    var FENIX = 'https://fenixplay.xyz/';
    var LIST = 'anitube_lampa_list';
    var DETAIL = 'anitube_lampa_detail';
    var STYLE = 'anitube-lampa-v0215-style';

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

    function requestText(network, url, success, failure, headers, postData, requestOptions) {
        var options = { dataType: 'text', timeout: 25000, headers: headers || {} };
        if (requestOptions) Object.keys(requestOptions).forEach(function (key) { options[key] = requestOptions[key]; });
        network.native(url, function (data) {
            success(String(data || ''));
        }, function (xhr, error) {
            var message = network.errorDecode ? network.errorDecode(xhr, error) : 'Помилка мережі';
            failure(message || 'Не вдалося завантажити сторінку');
        }, postData || null, options);
    }

    function cleanTitle(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .replace(/\s+(?:D\+S|Рік випуску аніме:|Рік виходу аніме:|Рік аніме:|Серій:|Жанр:|Категорія:|Переклад:|Ролі озвучували:|Опис:)[\s\S]*$/i, '')
            .replace(/^\s*[|·–—-]+\s*|\s*[|·–—-]+\s*$/g, '')
            .trim();
    }

    function relatedBaseTitle(value) {
        var name = cleanTitle(value).toLowerCase()
            .replace(/\([^)]*(?:сезон|season|фільм|film|movie|ova|спецвипуск|special)[^)]*\)/ig, ' ')
            .split(/\s*\/\s*/)[0]
            .split(/\s*[:：]\s*/)[0]
            .replace(/\s+/g, ' ').trim();
        name = name.replace(/\s+(?:фільм|film|movie|ova|special|спецвипуск)\s*(?:№?\s*\d+)?(?:\s+.*)?$/i, '').trim();
        if (/^(?:naruto|наруто)\b/i.test(name)) return 'naruto';
        if (/^(?:one\s*piece|ван\s*пісс?|великий\s+куш)\b/i.test(name)) return 'one piece';
        return name;
    }

    function parseCards(html) {
        var doc = document.createElement('div'); doc.innerHTML = html;
        var found = [], seen = {};
        function add(link, container) {
            if (!link) return;
            var href = absolute(link.getAttribute('href') || '', BASE);
            if (!href || !/^https?:\/\/anitube\.in\.ua\//i.test(href) || !/\/\d+-[^/]+\.html(?:$|[?#])/i.test(href) || seen[href]) return;
            var heading = link.querySelector('h2,h3,h4,[itemprop="name"]');
            var title = cleanTitle(link.getAttribute('title') || (heading && heading.textContent) || link.textContent || '');
            if (!title || title.length < 2 || title.length > 180) return;
            var scope = container || null;
            if (!scope) {
                var parent = link.parentNode;
                for (var depth = 0; parent && depth < 8; depth++, parent = parent.parentNode) {
                    if (parent.querySelector && parent.querySelector('img')) {
                        scope = parent;
                        var cls = String(parent.className || '');
                        if (/story|shortstory|news|anime|item/i.test(cls) || String(parent.tagName || '').toLowerCase() === 'article') break;
                    }
                }
            }
            var poster = scope && scope.querySelector ? scope.querySelector('span.story_post img, .story_post img, img') : link.querySelector('img');
            var raw = '';
            if (poster) {
                raw = poster.getAttribute('data-original') || poster.getAttribute('data-src') ||
                    poster.getAttribute('data-lazy-src') || poster.getAttribute('data-original-src') ||
                    poster.getAttribute('data-image') || poster.getAttribute('data-srcset') ||
                    poster.getAttribute('srcset') || poster.getAttribute('src') || '';
                if (raw.indexOf(',') >= 0) raw = raw.split(',')[0].trim().split(/\s+/)[0];
            }
            var image = raw ? absolute(raw, BASE) : '';
            if (image && /(?:spacer|blank|pixel|transparent|logo|avatar|icon)\.(?:gif|png|jpe?g|webp)(?:$|[?#])/i.test(image)) image = '';
            if (!image && scope && scope.querySelectorAll) {
                var imageLinks = scope.querySelectorAll('a[href]');
                for (var il = 0; il < imageLinks.length; il++) {
                    var candidateImage = absolute(imageLinks[il].getAttribute('href') || '', BASE);
                    if (/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(candidateImage)) { image = candidateImage; break; }
                }
            }
            seen[href] = true; found.push({ title: title, url: href, image: image });
        }
        var articles = doc.querySelectorAll('#dle-content article.story, article.story');
        for (var i = 0; i < articles.length; i++) add(articles[i].querySelector('h2[itemprop="name"] a[href], h2 a[href], h3 a[href], a[href*=".html"]'), articles[i]);
        if (!found.length) {
            var links = doc.querySelectorAll('#dle-content a[href], .content a[href], main a[href], a[href]');
            for (var j = 0; j < links.length; j++) add(links[j], null);
        }
        return found;
    }

    function parsePlaylist(raw) {
        var data;
        try { data = JSON.parse(raw); } catch (e) { data = null; }
        if (!data || !data.success || !data.response) return [];
        var doc = document.createElement('div');
        doc.innerHTML = data.response;
        var entries = doc.querySelectorAll('.playlists-videos li[data-file], li[data-id][data-file], li[data-file]');
        var labels = {};
        for (var i = 0; i < entries.length; i++) {
            var id = entries[i].getAttribute('data-id');
            labels[id] = (entries[i].textContent || '').split(/\s+/).join(' ').trim();
        }
        var result = [];
        for (var j = 0; j < entries.length; j++) {
            var node = entries[j];
            var file = node.getAttribute('data-file');
            if (!file || file === 'false' || file === '0') continue;
            var idParts = (node.getAttribute('data-id') || '').split('_');
            var path = [];
            for (var k = 1; k <= idParts.length; k++) {
                var prefix = idParts.slice(0, k).join('_');
                if (labels[prefix]) path.push(labels[prefix]);
            }
            var voice = node.getAttribute('data-voice') || '';
            var label = path.join(' · ') || (node.textContent || '').trim() || ('Серія ' + (result.length + 1));
            if (voice && label.toLowerCase().indexOf(voice.toLowerCase()) < 0) label += ' · ' + voice;
            result.push({ url: absolute(file, BASE).replace(/&amp;/g, '&'), label: label });
        }
        return result;
    }

    function parseLegacyPlaylist(html) {
        var result = [];

        function parseCall(code) {
            var marker = code.indexOf('RalodePlayer.init(');
            if (marker < 0) return [];
            var open = marker + 'RalodePlayer.init('.length;
            var depth = 1;
            var quote = '';
            var escaped = false;
            var end = -1;
            for (var i = open; i < code.length; i++) {
                var ch = code.charAt(i);
                if (quote) {
                    if (escaped) escaped = false;
                    else if (ch === '\\') escaped = true;
                    else if (ch === quote) quote = '';
                    continue;
                }
                if (ch === '"' || ch === "'") { quote = ch; continue; }
                if (ch === '(') depth++;
                else if (ch === ')') {
                    depth--;
                    if (depth === 0) { end = i; break; }
                }
            }
            if (end < 0) return [];
            var args;
            try { args = JSON.parse('[' + code.slice(open, end) + ']'); }
            catch (e) { return []; }
            var names = args[0] || [];
            var groups = args[1] || [];
            var items = [];
            for (var p = 0; p < groups.length; p++) {
                for (var e = 0; e < (groups[p] || []).length; e++) {
                    var item = groups[p][e] || {};
                    var codeValue = String(item.code || '').replace(/\\\//g, '/').replace(/&amp;/g, '&');
                    var match = codeValue.match(/https?:\/\/[^"'\s<>]+/i);
                    if (!match) continue;
                    var candidate = match[0].replace(/[),;]+$/, '');
                    items.push({
                        url: absolute(candidate, BASE),
                        label: cleanTitle((names[p] || '') + (names[p] ? ' · ' : '') + (item.name || ('Серія ' + (e + 1))))
                    });
                }
            }
            return items;
        }

        var doc = document.createElement('div');
        doc.innerHTML = html;
        var scripts = doc.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) {
            var parsed = parseCall(scripts[i].textContent || scripts[i].text || '');
            if (parsed.length) return parsed;
        }
        // Деякі шаблони віддають ініціалізацію програвача в сирому HTML поза звичайним script-вузлом.
        var rawParsed = parseCall(String(html || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
        if (rawParsed.length) return rawParsed;
        return result;
    }
    function parseEmbeddedPlaylist(html) {
        var doc = document.createElement('div'); doc.innerHTML = html;
        var result = [], seen = {};
        function add(url, label) {
            var value = absolute(String(url || '').replace(/&amp;/g, '&'), BASE);
            if (!value || seen[value]) return;
            if (value.indexOf('fenixplay.xyz/vod/') < 0 && !/\.(m3u8|mp4)(\?|$)/i.test(value)) return;
            seen[value] = true; result.push({ url: value, label: cleanTitle(label || ('Серія ' + (result.length + 1))) });
        }
        var nodes = doc.querySelectorAll('[data-file], [data-src], [data-url], iframe[src], source[src], a[href]');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i], value = node.getAttribute('data-file') || node.getAttribute('data-src') || node.getAttribute('data-url') || node.getAttribute('src') || node.getAttribute('href') || '';
            add(value, node.getAttribute('title') || node.getAttribute('aria-label') || (node.textContent || '').replace(/\s+/g, ' ').trim());
        }
        var scripts = doc.querySelectorAll('script');
        for (var j = 0; j < scripts.length; j++) {
            var re = /https?:\/\/fenixplay\.xyz\/vod\/[A-Za-z0-9._%-]+/ig, match, code = scripts[j].textContent || '';
            while ((match = re.exec(code))) add(match[0], 'Серія ' + (result.length + 1));
        }
        return result;
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
        var currentUrl = object.sourceUrl || (BASE + 'f/sort=date/order=desc/page/1/');
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

        function load(url, homeFallbackTried) {
            currentUrl = url;
            nextUrl = '';
            status.text('Завантаження каталогу AniTube…');
            grid.empty();
            root.find('.atl-actions').empty();
            var searchHeaders = query ? { 'Referer': BASE + 'anime/', 'X-Requested-With': 'XMLHttpRequest' } : {};
            var requestUrl = query && url === BASE + 'anime/'
                ? BASE + 'anime/?do=search&subaction=search&story=' + encodeURIComponent(query)
                : url;
            requestText(net, requestUrl, function (html) {
                if (!alive) return;
                var items = parseCards(html);
                if (!query && !items.length && url !== BASE && !homeFallbackTried) {
                    load(BASE, true);
                    return;
                }
                nextUrl = parseNext(html, url);
                render(items);
                if (nextUrl) {
                    var more = $('<button type="button" class="atl-button selector">Наступна сторінка</button>');
                    more.on('hover:focus', function () { focusScroll(this); });
                    more.on('hover:enter click', function () { load(nextUrl); });
                    root.find('.atl-actions').append(more);
                } else if (!query && (url === BASE || /\/page\/(\d+)\//.test(url))) {
                    var pageMatch = url.match(/\/page\/(\d+)\//);
                    var nextPageUrl = url === BASE
                        ? BASE + 'f/sort=date/order=desc/page/2/'
                        : url.replace(/\/page\/\d+\//, '/page/' + (Number(pageMatch[1]) + 1) + '/');
                    var moreFallback = $('<button type="button" class="atl-button selector">Наступна сторінка</button>');
                    moreFallback.on('hover:focus', function () { focusScroll(this); });
                    moreFallback.on('hover:enter click', function () { load(nextPageUrl); });
                    root.find('.atl-actions').append(moreFallback);
                }
                syncNavigation(true);
            }, function (message) {
                if (!alive) return;
                if (!query && !homeFallbackTried && url !== BASE && /404|не знайдено|not found/i.test(String(message))) {
                    load(BASE, true);
                    return;
                }
                showError(message);
            }, searchHeaders, null, query && url.indexOf('/anime/') >= 0 ? { type: 'POST' } : null);
        }

        function doSearch(event) {
            if (event && event.preventDefault) event.preventDefault();
            var value = root.find('.atl-query').val().trim();
            if (!value) { load(BASE + 'f/sort=date/order=desc/page/1/'); return; }
            // Пошук AniTube: POST на /anime/ з параметрами do/subaction/story у query string.
            var aliases = {
                'ван піс': 'One Piece',
                'ван пісс': 'One Piece',
                'наруто': 'Naruto',
                'атака титанів': 'Attack on Titan',
                'клинок що знищує демонів': 'Demon Slayer'
            };
            var normalized = value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
            var searchValue = aliases[normalized] || value;
            var url = BASE + 'anime/';
            Lampa.Activity.push({ url: url, title: 'Пошук: ' + value, component: LIST, page: 1, sourceUrl: url, search: searchValue });
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
        var relatedNet = new Lampa.Reguest();
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

        function addRelatedSeasons(html) {
            var doc = document.createElement('div');
            doc.innerHTML = html;
            var baseTitle = relatedBaseTitle(title);

            var candidates = [];
            var containers = doc.querySelectorAll(
                '.related, .related-news, .related_news, .related-posts, .related_posts, .related-anime, .related_anime, #related, .news-related'
            );
            for (var c = 0; c < containers.length; c++) {
                var inside = containers[c].querySelectorAll('a[href]');
                for (var n = 0; n < inside.length; n++) {
                    candidates.push({ link: inside[n], trusted: true });
                }
            }

            var contentLinks = doc.querySelectorAll('#dle-content a[href]');
            for (var p = 0; p < contentLinks.length; p++) {
                candidates.push({ link: contentLinks[p], trusted: false });
            }

            var seen = {};
            var added = 0;
            for (var i = 0; i < candidates.length; i++) {
                var link = candidates[i].link;
                var href = absolute(link.getAttribute('href'), item.url);
                if (!href || href === item.url || !/\.html(?:$|[?#])/i.test(href) ||
                    !/^https?:\/\/anitube\.in\.ua\//i.test(href) || seen[href]) continue;

                var heading = link.querySelector('h2,h3,h4,.title,[itemprop="name"]');
                var image = link.querySelector('img');
                var label = cleanTitle(
                    (heading && heading.textContent) ||
                    (image && (image.getAttribute('alt') || image.getAttribute('title'))) ||
                    link.getAttribute('title') ||
                    link.textContent || ''
                );
                if (!label || label.length > 100) continue;
                if (!candidates[i].trusted && baseTitle && label.toLowerCase().indexOf(baseTitle) !== 0) continue;
                if (/^(?:попередня|наступна) серія$/i.test(label)) continue;

                seen[href] = true;
                var button = $('<button type="button" class="atl-button selector"></button>').text(label);
                button.on('hover:focus', function () { focusScroll(this); });
                button.on('hover:enter click', (function (seasonUrl, seasonTitle) {
                    return function () {
                        Lampa.Activity.push({
                            url: seasonUrl,
                            title: seasonTitle,
                            component: DETAIL,
                            page: 1,
                            item: { title: seasonTitle, url: seasonUrl },
                            movie: object.movie || null
                        });
                    };
                }(href, label)));
                actions.append(button);
                added++;
            }
            if (added) {
                var heading = $('<div class="atl-meta"></div>').text('Інші сезони та пов’язані частини');
                actions.prepend(heading);
            } else if (baseTitle.length >= 3) {
                // Якщо сторінка не містить явного блоку пов'язаних публікацій,
                // шукаємо інші публікації з тією самою назвою через пошук AniTube.
                var relatedQuery = baseTitle === 'one piece' ? 'Ван Піс' : (baseTitle === 'naruto' ? 'Наруто' : baseTitle);
                var searchUrl = BASE + 'anime/?do=search&subaction=search&story=' + encodeURIComponent(relatedQuery);
                requestText(relatedNet, searchUrl, function (searchHtml) {
                    if (!alive) return;
                    var matches = parseCards(searchHtml);
                    var searchBase = baseTitle;
                    var count = 0;
                    matches.forEach(function (match) {
                        if (!match.url || match.url === item.url) return;
                        var candidate = relatedBaseTitle(match.title);
                        if (!candidate || candidate !== searchBase) return;
                        if (seen[match.url]) return;
                        seen[match.url] = true;
                        var button = $('<button type="button" class="atl-button selector"></button>').text(cleanTitle(match.title));
                        button.on('hover:focus', function () { focusScroll(this); });
                        button.on('hover:enter click', (function (seasonUrl, seasonTitle) {
                            return function () {
                                Lampa.Activity.push({
                                    url: seasonUrl,
                                    title: seasonTitle,
                                    component: DETAIL,
                                    page: 1,
                                    item: { title: seasonTitle, url: seasonUrl },
                                    movie: object.movie || null
                                });
                            };
                        }(match.url, cleanTitle(match.title))));
                        actions.append(button);
                        count++;
                    });
                    if (count) {
                        actions.prepend($('<div class="atl-meta"></div>').text('Інші сезони та пов’язані частини'));
                        syncNavigation(true);
                    }
                }, function () {}, { 'Referer': BASE + 'anime/', 'X-Requested-With': 'XMLHttpRequest' }, null, { type: 'POST' });
            }
        }
        function addEpisode(url, label) {
            if (!url || vodUrls.indexOf(url) >= 0) return;
            vodUrls.push(url);
            var button = $('<button type="button" class="atl-episode selector"></button>').text(label || ('Серія ' + vodUrls.length));
            button.on('hover:focus', function () { focusScroll(this); });
            button.on('hover:enter click', function () { loadVod(url); });
            episodes.append(button);
        }

        function loadPlaylist() {
            var newsId = '';
            var pathMatch = String(item.url || '').match(/\/(\d+)-[^/?#]+\.html(?:[?#]|$)/i);
            if (pathMatch) newsId = pathMatch[1];
            if (!newsId) {
                var segments = String(item.url || '').split('/');
                for (var n = 0; n < segments.length; n++) {
                    var candidateMatch = segments[n].match(/^(\d+)-/);
                    if (candidateMatch) { newsId = candidateMatch[1]; break; }
                }
            }
            if (!newsId) {
                status.text('Не вдалося визначити номер публікації AniTube для отримання списку серій.');
                syncNavigation(false);
                return;
            }
            status.text('Запитую список серій AniTube…');
            var playlistUrl = BASE + 'engine/ajax/playlists.php?news_id=' + encodeURIComponent(newsId) + '&xfield=playlist';
            requestText(net, playlistUrl, function (raw) {
                if (!alive) return;
                var list = parsePlaylist(raw);
                if (!list.length) list = parseLegacyPlaylist(htmlCache);
                if (!list.length) list = parseEmbeddedPlaylist(htmlCache);
                list.forEach(function (entry) { addEpisode(entry.url, entry.label); });
                if (vodUrls.length) {
                    status.text('Знайдено серій та варіантів озвучення: ' + vodUrls.length + '. Вибери потрібний пункт нижче.');
                } else {
                    status.text('AniTube не повернув розпізнаваних пунктів плейлиста. Можливо, список формується іншим запитом або потребує додаткових параметрів.');
                }
                syncNavigation(true);
            }, function (message) {
                if (!alive) return;
                var fallback = parseLegacyPlaylist(htmlCache);
                if (!fallback.length) fallback = parseEmbeddedPlaylist(htmlCache);
                fallback.forEach(function (entry) { addEpisode(entry.url, entry.label); });
                status.text(vodUrls.length
                    ? 'Список серій отримано зі сценарію плеєра AniTube. Вибери потрібний пункт нижче.'
                    : 'Не вдалося отримати плейлист AniTube: ' + message);
                syncNavigation(true);
            }, { 'Referer': BASE, 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/javascript, */*; q=0.01' });
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
            if (payload) {
                status.text('Підключення до FenixPlay…');
                loadEpisodeApi(payload, vodUrl);
                return;
            }
            if (/\.(m3u8|mp4)(?:$|[?#])/i.test(vodUrl)) {
                status.text('Передаю відеопотік до програвача Lampa…');
                Lampa.Player.play({ url: vodUrl, title: title, quality: 'auto', movie: object.movie || null });
                return;
            }
            var vod = extractVod(vodUrl);
            if (vod) {
                var nested = decodeJwtPayload(vod);
                if (nested) { loadEpisodeApi(nested, vod); return; }
            }
            status.text('Пункт плейлиста отримано, але його посилання не є прямим відеопотоком або розпізнаним посиланням FenixPlay. Потрібно окремо обробити цей формат.');
        }

        var htmlCache = '';

        this.create = function () {
            requestText(net, item.url, function (html) {
                if (!alive) return;
                htmlCache = html;
                var doc = document.createElement('div');
                doc.innerHTML = html;
                var pageTitle = doc.querySelector('#dle-content h1, #dle-content h2[itemprop="name"], h1[itemprop="name"], h1');
                var image = doc.querySelector('#dle-content .fullstory img, #dle-content .full-story img, #dle-content .fullstory img, #dle-content article img');
                var text = doc.querySelector('#dle-content .fullstory, #dle-content .full-story, #dle-content .story_c_text, .fullstory, .full-story');
                if (image) { var detailImageUrl = image.getAttribute('data-original') || image.getAttribute('data-src') || image.getAttribute('data-lazy-src') || image.getAttribute('src'); if (detailImageUrl && !/spacer\\.gif/i.test(detailImageUrl)) root.find('.atl-title').before($('<img>').attr('src', absolute(detailImageUrl, item.url))); }
                if (pageTitle && pageTitle.textContent.trim()) {
                    title = cleanTitle(pageTitle.getAttribute('title') || pageTitle.textContent);
                    root.find('.atl-title').text(title);
                }
                if (text) {
                    var clean = text.cloneNode(true);
                    var junk = clean.querySelectorAll('script,style,noscript,iframe,svg,form,button,.story_infa,.rating,.rate,.comments,.related,.related-news,.similar');
                    for (var j = 0; j < junk.length; j++) junk[j].parentNode.removeChild(junk[j]);
                    root.find('.atl-meta').text(clean.textContent.replace(/\s+/g, ' ').trim().slice(0, 1800));
                }

                // Пов'язані сезони/частини на сторінках AniTube подані окремими посиланнями.
                addRelatedSeasons(html);

                // Основний спосіб AniTube: AJAX playlist endpoint за ID публікації.
                loadPlaylist();
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
        this.destroy = function () { alive = false; net.clear(); relatedNet.clear(); scroll.destroy(); root.remove(); };
    }

    function addMenu() {
        if ($('.atl-menu-item').length) return;
        var item = $('<li class="menu__item selector atl-menu-item"><div class="menu__ico"><svg viewBox="0 0 44 44" aria-hidden="true"><path d="M8 13.5 22 6l14 7.5v17L22 38 8 30.5v-17Z" fill="currentColor" opacity=".13"/><path d="M8 13.5 22 6l14 7.5v17L22 38 8 30.5v-17Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m18 16 11 6-11 6V16Z" fill="currentColor"/><path d="M13 10.8 22 6l9 4.8M13 33.2l9 4.8 9-4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="m33.5 7 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="currentColor"/></svg></div><div class="menu__text">AniTube</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: 'AniTube', component: LIST, page: 1, sourceUrl: BASE + 'f/sort=date/order=desc/page/1/' });
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
                    sourceUrl: BASE + 'anime/',
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