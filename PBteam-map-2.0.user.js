// ==UserScript==
// @name         Мини-карта 2x2 Pixel Battle Team Crew
// @namespace    http://tampermonkey.net/
// @version      2.2.20
// @description  Overlay-like tool for pixelzone.io
// @author       meatie, modified by Yoldaş Pisicik. URL adaptive by Edward Scorpio. 2x2 Designed by MDOwlman.
// @match        https://pixelzone.io/*
// @homepage     https://github.com/EdwardScorpio/pz-map/
// @updateURL    https://raw.githubusercontent.com/EdwardScorpio/pz-map/main/PBteam-map-2.0.user.js
// @downloadURL  https://raw.githubusercontent.com/EdwardScorpio/pz-map/main/PBteam-map-2.0.user.js
// @icon         https://i.ibb.co/C5S0R1bV/Square-Logo2x2.png
// @grant        GM_info
// @run-at       document-end
// ==/UserScript==
/* Based on https://github.com/Pinkfloydd/ArgentinaMap_PixelZone
Инструкции
Используйте плагин Tampermonkey, чтобы внедрить это в игру. Добавьте скрипт, вставьте код.
Путь к изображениям должен быть прямым, например: https://image.com/img.png.
Код для ссылок и координат находится на 450-ых строках.
Клавиши:
Пробел : Показать и скрыть карту. Это также перезагружает изображения шаблона после обновления.
QERTYUIOP и FGHJKLZ : выбрать цвет
+/- numpad: масштабирование миникарты (Так же можно масштабировать на клавиши "-" и "=" )
0: Включить\Выключить Автовыбор цвета
9: Проверить наличие обновлений (Так же, оно выполняется автоматически при загрузке страницы PixelZone, и в настройках)

Мини-карта стартует скрытой. Чтобы она заработала - откройте её.
*/
var vers = "";
var range = 16; //margin for showing the map window
var x, y, zoomlevel, zooming_out, zooming_in, zoom_time, x_window, y_window, coorDOM, gameWindow;
var toggle_show, toggle_follow, counter, image_list, needed_templates, mousemoved;
var minimap, minimap_board, minimap_cursor, minimap_box, minimap_text;
var ctx_minimap, ctx_minimap_board, ctx_minimap_cursor,setFactionTemplates;

Number.prototype.between = function (a, b) {
  var min = Math.min.apply(Math, [a, b]);
  var max = Math.max.apply(Math, [a, b]);
  return this > min && this < max;
};
var autoColorEnabled = false;
const MINIMAP_VERSION = "2.2.20";

function startup() {
document.addEventListener('keydown', function(e) {
  if (e.key === '9') {
    checkForUpdates(false);
  }
});

function addUpdateCheckListener() {
    const checkUpdatesButton = document.getElementById("check-updates");
    if (checkUpdatesButton && !checkUpdatesButton.hasAttribute("data-listener-added")) {
        checkUpdatesButton.addEventListener("click", () => checkForUpdates(false));
        checkUpdatesButton.setAttribute("data-listener-added", "true");
    }
}
    const versionLabel = document.getElementById("versionLabel");
if (versionLabel) {
  versionLabel.textContent = "Версия: " + MINIMAP_VERSION;
}
  window.timerDiv = undefined;
  var i, t = getCookie("baseTemplateUrl");
  var leftContainer, usersDiv, coordDiv;

  console.log("Try: listTemplates() and keys space, QERTYUIOP FGHJKLZ");
  gameWindow = document.getElementsByTagName("canvas")[0];

  leftContainer = document.getElementsByClassName("_left_16o3w_27")[0];
  usersDiv = leftContainer.childNodes[0];
  coordDiv = leftContainer.childNodes[1];

  var pixelCounter = document.createElement('div');
pixelCounter.className = '_flex_16o3w_1 _row_16o3w_8 _center_16o3w_14 _background_xd2n8_16 _padding_xd2n8_39 _margin_xd2n8_43 _fit-content_xd2n8_34 _note_9gyhg_1';
pixelCounter.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg
       width="1.2em" height="1.2em"
       viewBox="0 0 454 454"
       fill="#aaaaaa"
       stroke="Whitw" stroke-width="4"
       stroke-linecap="round" stroke-linejoin="round"
       style="margin: 2px; border-style:double;border-width:4px;font-family: 'Press Start 2P', cursive">
    <g>
      <g>
        <path d="M228.062,154.507h-34.938v65.631h34.938c18.094,0,32.814-14.72,32.814-32.814 C260.877,169.23,246.156,154.507,228.062,154.507z"/>
        <path d="M0,0v454h454V0H0z M228.062,279.648h-34.938v79.398h-59.512V94.952l94.451,0.043c50.908,0,92.325,41.418,92.325,92.328 C320.388,238.232,278.971,279.648,228.062,279.648z"/>
      </g>
    </g>
  </svg>
  <span id="pixelCounter" class="notranslate">0</span>
`;
// --- Перенос счётчика пикселей в нижний правый угол (в стиле миникарты) ---
pixelCounter.style.position = "fixed";
pixelCounter.style.right = "5px";           // отступ справа
pixelCounter.style.bottom = "5px";          // отступ снизу
pixelCounter.style.zIndex = "99999";         // поверх всего
pixelCounter.style.background = "rgba(25, 25, 25, 1)"; // почти как фон миникарты
pixelCounter.style.border = "1px double rgba(255, 255, 255, 1)";
pixelCounter.style.borderRadius = "0px";
pixelCounter.style.padding = "8px 14px";     // внутренний отступ
pixelCounter.style.color = "#fffff";        // слегка серый текст, не режет глаз
pixelCounter.style.fontWeight = "2000";       // средне-жирный шрифт
pixelCounter.style.fontSize = "20px";
pixelCounter.style.display = "flex";
pixelCounter.style.alignItems = "center";
pixelCounter.style.gap = "4px";              // отступ между иконкой и числом
pixelCounter.style.boxShadow = "0px rgba(0,0,0,0.3)";
pixelCounter.style.transition = "all 0.3s ease"; // плавная анимация
pixelCounter.style.pointerEvents = "none";   // чтобы не мешал кликам по игре

document.body.appendChild(pixelCounter);
pixelCounter.addEventListener("click", () => {
    updateloop(); // Запускаем твою функцию обновления данных (включая счётчик)
    // Небольшая анимация "клик"
    pixelCounter.style.transform = "scale(0.95)";
    setTimeout(() => {
        pixelCounter.style.transform = "scale(1)";
    }, 150);
});



  //DOM element of the displayed X, Y
  coorDOM = coordDiv.childNodes[1];

  //coordinates of the middle of the window
  x_window = y_window = 0;

  //coordinates of cursor
  x = y = 0;

  //list of all available templates
  window.template_list = null;

  //minimap zoom level
  zoomlevel = 16;

  //toggle options
  toggle_show = false;
  toggle_follow = true; //if minimap is following window, x_window = x and y_window = y;
  zooming_in = zooming_out = false;
  zoom_time = 50;

  //array with all loaded template-images
  window.image_list = [];
  counter = 0;


  //templates which are needed in the current area
  needed_templates = [];
  //Cachebreaker to force image refresh. Set it to eg. 1
  window.cachebreaker = "invisible";
var div = document.createElement('div');;
div.setAttribute('class', 'post block bc2');

div.innerHTML = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* Применяем пиксельный шрифт ко всему */
#minimapbg,
#minimapbg *,
#minimap-title,
#minimap-text,
#minimap-config span,
#minimap_settings,
#minimap_settings *,
#infoButton,
#check-updates,
#settings-map-2,
#languageLabel,
#volumeLabel,
#versionLabel,
#languageSelect,
#infoText,
#infoContent {
    font-family: 'Press Start 2P', cursive !important;
    letter-spacing: 0 !important;
    font-weight:normal
}

/* Остальные твои стили (шрифт и т.д.) остаются без изменений */
#minimapbg,
#minimapbg * {
    font-family: 'Press Start 2P', cursive !important;
    letter-spacing: 0.5px !important;
}

/* Подгонка размеров — чтобы ничего не прыгало и не растягивалось */
#minimap-title {
    font-size: 16px !important;
    line-height: 18px !important;
    padding: 4px !important;
        clip-path: polygon(
        20px 0,
        calc(100% - 20px) 0,
        100% 20px,
        100% 100%,
        0 100%,
        0 20px
    );
}

#minimap-text {
    font-size: 12px !important;
    line-height: 18px !important;
    padding: 2px 10px 2px 10px !important;
}


/* Переработанное меню настроек — в стиле основной панели */
#settings-title {
    background-color: #000;

    background-image:
        repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 1px,
            transparent 1px,
            transparent 4px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 1px,
            transparent 1px,
            transparent 4px
        );

    color: white;
    box-shadow: inset 0px #000;
    text-shadow: 1px 1px 0 #000;
    border-radius: 0;
    background-size: 6px 6px, 6px 6px, 48px 48px, 48px 48px;
    border: 2px solid #777;
    border-radius: 0px;
    box-shadow: inset 0 0 1px #666, 0 2px 2px rgba(0,0,0,0.4);
    padding: 4px;
    margin:4px;
}
#minimap_settings span,
#minimap_settings select,
#minimap_settings input[type="range"] {
    background: black;
    color: white;
    border-radius: 0px;
    border: 2px solid #777;
    box-shadow: 0 1px 1px rgba(0,0,0,0.3), inset 0 0 3px rgba(255,255,255,0.3);
    cursor: pointer;
    font-size: 16px;
    text-shadow:0
    transition: transform 0.1s;
}
#zoom-plus,
#zoom-minus {
    overflow: hidden;
}

#zoom-plus {
    clip-path: polygon(
        7px 0,
        calc(100% - 7px) 0,
        100% 7px,
        100% 100%,
        0 100%,
        0 7px
    );
}
#zoom-minus {
    clip-path: polygon(
        0 0,
        100% 0,
        100% calc(100% - 7px),
        calc(100% - 7px) 100%,
        6px 100%,
        0 calc(100% - 7px)
    );
}

#minimap_settings span:active {
    transform: scale(0.97);
}

#languageSelect {
    background: black;
    color: white;
    border: 2px solid #777;
}

#infoContent {
    background: #eaeaea;
    color: #333;
    padding: 10px;
    border-radius: 0px;
    margin-top: 10px;
    display: none;
    text-align: left;
    line-height: 1.5;
}

/* Твои оригинальные стили — полностью сохранены */
#minimapbg {
    background-color: #bcbcbc !important;

    background-image:
        /* Мелкая пиксельная сетка */
        repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.10) 0px,
            rgba(0,0,0,0.10) 1px,
            transparent 1px,
            transparent 5px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(0,0,0,0.10) 0px,
            rgba(0,0,0,0.10) 1px,
            transparent 1px,
            transparent 5px
        ),

        /* Крупные эфирные блоки (2x2 вайб) */
        repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 28px,
            rgba(0,0,0,0.08) 28px,
            rgba(0,0,0,0.08) 32px
        ),
        repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 28px,
            rgba(0,0,0,0.08) 28px,
            rgba(0,0,0,0.08) 32px
        ),

        /* Лёгкий диагональный эфирный шум */
        repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.04) 0px,
            rgba(0,0,0,0.04) 2px,
            transparent 2px,
            transparent 10px
        );

    background-size:
        6px 6px,
        6px 6px,
        32px 32px,
        32px 32px,
        12px 12px;

    background-position: 0 0;
    border-radius:0;
    border: 2px solid black;
    box-shadow: inset 0 0 2px #666, 0 4px 10px rgba(0, 0, 0, 0.5);
    padding: 6px;
}

#minimap-text,
#minimap-title {
    box-shadow:0
    text-shadow:0
        clip-path: polygon(22px 0),
        calc(100% - 22px) 0,
        100% 22px,
        100% 100%,
        0 100%,
        0 22px
);
}

#minimap-config,
#minimap_settings {
    background-color: #bcbcbc !important;

    background-image:
        /* Мелкая пиксельная сетка */
        repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.10) 0px,
            rgba(0,0,0,0.10) 1px,
            transparent 1px,
            transparent 5px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(0,0,0,0.10) 0px,
            rgba(0,0,0,0.10) 1px,
            transparent 1px,
            transparent 5px
        ),

        /* Крупные эфирные блоки (2x2 вайб) */
        repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 2px,
            rgba(0,0,0,0.08) 28px,
            rgba(0,0,0,0.08) 32px
        ),
        repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 28px,
            rgba(0,0,0,0.08) 28px,
            rgba(0,0,0,0.08) 32px
        ),

        /* Лёгкий диагональный эфирный шум */
        repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.04) 0px,
            rgba(0,0,0,0.04) 2px,
            transparent 2px,
            transparent 10px
        );

    background-size:
        4px 4px,
        4px 4px,
        32px 32px,
        32px 32px,
        4px 8px;

    background-position: 0 0;
    border-radius: 0px;
    box-shadow: inset 0 0 4px #666, 0 2px 1px rgba(0, 0, 0, 0.4);
    padding: 4px;
}

#minimap_settings button,
#minimap_settings span,
#minimap_settings select,
#minimap_settings input[type="range"] {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 0 3px rgba(255, 255, 255, 0.3);
    transition: transform 0.1s ease, box-shadow 0.1s ease;
}

#minimap_settings button:active,
#minimap_settings span:active {
    transform: scale(0.97);
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.5);
}
#settings-title {
    background-color: #000;

    background-image:
        repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 1px,
            transparent 1px,
            transparent 4px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 1px,
            transparent 1px,
            transparent 4px
        );

    color: white;
    box-shadow: inset 0 0 3px #000;
    text-shadow: 1px 1px 0 #000;
    border-radius: 0;
}

/* === ПИКСЕЛЬНЫЙ СЛАЙДЕР ГРОМКОСТИ === */
#volumeSlider {
    -webkit-appearance: none;
    appearance: none;

    width: 200px;
    height: 8px;

    background: #000;
    border: 1px solid #fff;
    border-radius: 0;

    outline: none;
    cursor: pointer;
}

/* Chrome / Edge */
#volumeSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;

    width: 12px;
    height: 20px;

    background: #ff0000;
    border: 2px solid #fff;
    border-radius: 0;

    cursor: pointer;
}

/* Firefox */
#volumeSlider::-moz-range-thumb {
    width: 12px;
    height: 20px;

    background: #ff0000;
    border: 2px solid #fff;
    border-radius: 0;

    cursor: pointer;
}

#volumeSlider::-moz-range-track {
    background: #000;
    border: 2px solid #fff;
    border-radius: 0;
    height: 12px;
}

#volumeLabel,
#volumeSlider {
  display: inline-block;
  vertical-align: middle;
}


#minimap-config span,
#autoColorButton,
#zoomDisplay {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 0 4px rgba(255, 255, 255, 0.3);
    transition: transform 0.1s ease, box-shadow 0.2s ease;
}

#minimap-config span:active,
#autoColorButton:active {
    transform: scale(0.96);
    box-shadow: inset 1px 1px 4px rgba(0, 0, 0, 0.4);
}

#zoomDisplay {
    background-image:
        repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.12) 0px,
            rgba(0,0,0,0.12) 1px,
            transparent 1px,
            transparent 4px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(0,0,0,0.12) 0px,
            rgba(0,0,0,0.12) 1px,
            transparent 1px,
            transparent 4px
        );
    color: white;
    padding: 6px;
    border-radius: 0px;
    font-size: 0.95em;
    text-align: center;
}
* {
    font-family: 'Press Start 2P', cursive !important;}
/* Палитра PixelZone — по центру снизу, ниже координат */
div[class*="palette"],
[class*="_palette-"] {
    position: fixed !important;
    bottom: 10px !important;     /* Ниже координат (координаты обычно на ~10-20px от низа) */
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important; /* Точная центровка по горизонтали */
    z-index: 10000 !important;   /* Ниже мини-карты и её элементов */
}

/* Координаты — всегда поверх палитры */
div[class*="coord"],
span[class*="coord"],
div[class*="coords"],
div[class*="note"] {  /* Это блоки с координатами и количеством игроков */
    z-index: 10050 !important;
    pointer-events: none !important;
}
/* === ОСНОВНАЯ ПАНЕЛЬ === */
#minimap_settings {
background-color: #202020;

    background-image:
        repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 4px,
            transparent 4px,
            transparent 4px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.08) 0px,
            rgba(255,255,255,0.08) 4px,
            transparent 4px,
            transparent 4px
        );

    color: white;
    box-shadow: inset 0;
    text-shadow: 0 ;
    border-radius: 0;
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

/* === КНОПКИ === */
#infoButton,
#check-updates,
#settings-map-2 {
    background: #111 !important;
    color: #fff !important;
    padding: 10px 10px !important;
    margin: 2px !important;
    border: none !important;
    cursor: pointer;
    user-select: none;
    display: inline-block;
    box-shadow:
        inset 0 0 2px #444,
        0 2px 4px rgba(0,0,0,.4);
    clip-path: polygon(
    16px 0,
    calc(100% - 16px) 0,
    100% 16px,

    100% calc(100% - 16px),
    calc(100% - 16px) 100%,
    16px 100%,

    0 calc(100% - 16px),
    0 16px
);
}

#check-updates {
    background: #01796F !important;
}

#settings-map-2 {
    background: #003153 !important;
}

#infoButton:active,
#check-updates:active,
#settings-map-2:active {
    transform: scale(0.96);
}

/* === ИНФО-БЛОК === */
#infoContent {
    background: #ededed !important;
    border-radius: 0px;
    color: #333;
    font-size:12px;
    letter-spacing:0.3px;
    border: 4px dashed #999 !important;
    padding: 8px !important;
    font-size:12px;
    letter-spacing:0.3px;
    margin-top: 8px !important;
    box-shadow: none !important;
    text-shadow: none !important;
}

/* === ЯЗЫК === */
#languageLabel {
    background: purple !important;
    color: white !important;
    padding: 4px 6px !important;
    margin: 8px !important;
    display: inline-block;
}

#languageSelect {
    background: #222 !important;
    color: #fff !important;
    border: 2px solid #000 !important;
    padding: 8px !important;
    outline: none !important;
}

/* === ВЕРСИЯ === */
#versionLabel {
    background: blue !important;
    color: #0fffff !important;
    padding: 2px 2px !important;
    box-shadow: inset 0 0 2px #004;
}


</style>

<div id="minimapbg" style="background-color:rgba(202,202,202,100%); border-radius:0px; position:absolute;right:5px; bottom:0; z-index:1;border-style:double;border-width:6px 6px 6px 6px;border-color:black">
    <div class="posy unselectable" id="posyt" style="background-size:100%; color:#fff; text-align:center; width:auto; height:auto; padding:2px 2px 4px 2px;">
      <div id="minimap-text" style="background:DimGray;padding-left:10px;padding-right:10px;padding-top:2px;padding-bottom:2px;border-radius:0px ;user-select:none;"></div>
      <div id="minimap-title" style="background:Black;border-radius:0;;padding-left:10px;padding-right:10px;user-select:none;">=2X2 МИНИ-КАРТА=</div>
      <div id="minimap-box" style="position:relative;width:390px;height:280px">
        <canvas id="minimap" style="width: 100%; height: 100%;z-index:1;position:absolute;top:0;left:0;"></canvas>
        <canvas id="minimap-board" style="width: 100%; height: 100%;z-index:2;position:absolute;top:0;left:0;"></canvas>
        <canvas id="minimap-cursor" style="width: 100%; height: 100%;z-index:3;position:absolute;top:0;left:0;"></canvas>
      </div>
      <div id="minimap-config" style="line-height:36px;border-style:solid;border-width:2px;border-color:Gray;border-radius:0px;background:#444444;padding:3px;margin:2px 4px 2px 2px">
        <span id="hide-map" style="cursor:pointer;user-select:none;font-weight:normal;font-size:0.75em;background:#1164B4;padding-left:2px;padding-right:2px;;padding-top:6px;padding-bottom:6px;border-radius:0;margin-left:-2px;margin-right:-14px;border-style:dotted;border-width:2px 0;border-color:#003181">Скрыть</span>
        <span id="settings-map" style="cursor:pointer;user-select:none;font-weight:normal;font-size:0.75em;background:Teal;padding-left:2px;padding-right:2px;;padding-top:6px;padding-bottom:6px;border-radius:0;margin-right:-13px;border-style:dashed;border-width:2px 0;border-color:#006060">Настройки</span>
        <span id="zoom-plus" style="cursor:pointer;font-weight:normal;font-size:0.75em;user-select:none;background:Crimson;padding-left:1px;;padding-top:8px;padding-bottom:8px;padding-right:1px;border-radius:0px;border-style:solid;border-width:0 2px 2px ;border-color:#BA021A;margin-left:0;margin-right:-7px">+</span>
        <span id="zoom-minus" style="cursor:pointer;font-weight:normal;font-size:0.75em;user-select:none;background:Blue;padding-left:1px;;padding-top:8px;padding-bottom:8px;padding-right:1px;border-radius:0px;border-style:solid;border-width:2px 2px 0;border-color:#0000AA;margin-left:-7px;margin-right:-6px">-</span>
       <span id="autoColorButton" style="cursor:pointer;font-weight:normal;font-size:0.75em;padding:0 6px 0 6px;border-radius:0;background:black;;padding-top:8px;padding-bottom:8px;margin-left:-6px;margin-right:0px;border-style:double;border-width:4px;border-color:Slategray;transition: background-color 0.8s ease, color 0.8s ease;">Авто-цвет</span>
      </div>
    </div>
    <div id="minimap_settings" style="background-size:100%;border-radius:0px; width:auto; height:auto; text-align:center; display:none;padding: 4px 4px 4px 4px;">
      <div id="settings-title">Настройки Мини-Карты</div>
      <p>
      <div id="infoButton" style="display:inline-block; background-color:black; color:white; padding:4px 4px 4px 4px;margin:-2px 10px -2px 4px; border:none; border-radius:0px; cursor:pointer;">
        Информация
        <p>
      </div>
      <div id="infoContent" style="display:none; margin-top:10px; padding:10px; background-color:#f1f1f1; border:4px dashed #cccbba; border-radius:0px; color:#333;">
        <div id="infoText" style="#infoContent,box-shadow: none;text-shadow: none;">
          <p>Привет фанат телеканала 2х2!</p>
          <p>Данная мини-карта сделана специально для тебя!</p>
          <p>Данная мини-карта была создана благодаря следующим людям:</p>
          <p>Генерал Пиксельных войн Edward Scorpio</p>
          <p>Генерал Пиксельных войн Ultimate Pekar</p>
          <p>Генерал-Комендаторе MDOwlman.</p>
          <p>Данная карта была официально создана 18 сентября 2024 года.</p>
        </div>
      </div>
      <p>
      <span id="languageLabel" style="user-select: none; padding: 4px 4px 4px 4px;margin:10px 10px 10px 10px; background:Purple; border-radius:0px;">
        Язык&nbsp;
      </span>
      <select id="languageSelect" style="margin-left:6px; outline:0; border-radius:0px;">
        <option value="ru">🇷🇺 Русский</option>
        <option value="en">🇬🇧 English</option>
        <option value="es">🇪🇸 Español</option>
        <option value="tr">🇹🇷 Türkçe</option>
        <option value="fi">🇫🇮 Suomi</option>
        <option value="fr">🇫🇷 Français</option>
        <option value="pt">🇵🇹 Português</option>
        <option value="sv">🇸🇪 Svenska</option>
        <option value="kk">🇰🇿 Қазақша</option>
        <option value="it">🇮🇹 Italiano</option>
      </select>
      <p>
        <span id="volumeLabel" style="color:#FFFFFF;background-color:NAVY;padding:6px ;margin:10px;border-radius:0px">Звук</span>
        <input type="range" id="volumeSlider" min="0" max="100" value="100">
      </p>
      <p>
        <span id="check-updates" style="cursor:pointer;user-select:none;background:#01796F;padding-left:4px;padding-right:4px;margin:20px 20px 20px 20px;border-radius:0px;">Обновления</span>
        <span id="versionLabel" style="color:#0fffff;background:Blue;padding-left:4px;padding-right:4px;border-radius:0px;">Версия: 2.2.20</span>
      </p>
      <p>
        <span id="settings-map-2" style="cursor:pointer;user-select:none;text-align:center;background:#003153;padding-left:6px;padding-right:6px;border-radius:0px;margin:6px;">Вернуться</span>
    </div>
</div>
`;

document.body.appendChild(div);
    addUpdateCheckListener();

    const Lang = localStorage.getItem("minimapLang") || "ru";
const languageSelect = document.getElementById("languageSelect");
if (languageSelect) {
  languageSelect.value = Lang;
  languageSelect.addEventListener("change", () => {
    const lang = languageSelect.value;
    localStorage.setItem("minimapLang", lang);
    updateLanguage(lang);
      const infoEl = document.getElementById("infoContent");
  if (infoEl && texts.infoContent && texts.infoContent[lang]) {
    infoEl.innerHTML = texts.infoContent[lang];
     const infoButton = document.getElementById('infoButton')
  }
      const infoTextEl = document.getElementById("infoText");
if (infoTextEl && texts.infoContent && texts.infoContent[lang]) {
    infoTextEl.innerHTML = texts.infoContent[lang];
    const versionEl = document.getElementById("versionLabel");
if (versionEl && texts.version && texts.version[lang]) {
  versionEl.textContent = texts.version[lang] + ": " + MINIMAP_VERSION;
}
   vers = texts.versionTitle[lang] || "=2X2 МИНИ-КАРТА=";
const title = document.getElementById("minimap-title");
if (title) title.textContent = vers;
}
  });
}
const volSlider = document.getElementById("volumeSlider");
const savedVol = parseInt(localStorage.getItem("minimapVolume") || "100", 10);

function setVolume(percent) {
  const v = percent / 100;
  Object.values(audioEls).forEach(a => a.volume = v);
}

if (volSlider) {
  volSlider.value = savedVol;
  setVolume(savedVol);

  volSlider.addEventListener("input", () => {
    const v = parseInt(volSlider.value, 10);
    localStorage.setItem("minimapVolume", v);
    setVolume(v);
  });
}

  minimap = document.getElementById("minimap");
  minimap_board = document.getElementById("minimap-board");
  minimap_cursor = document.getElementById("minimap-cursor");
  minimap.width = minimap.offsetWidth;
  minimap_board.width = minimap_board.offsetWidth;
  minimap_cursor.width = minimap_cursor.offsetWidth;
  minimap.height = minimap.offsetHeight;
  minimap_board.height = minimap_board.offsetHeight;
  minimap_cursor.height = minimap_cursor.offsetHeight;
  ctx_minimap = minimap.getContext("2d");
  ctx_minimap_board = minimap_board.getContext("2d");
  ctx_minimap_cursor = minimap_cursor.getContext("2d");
  minimap_box = document.getElementById("minimap-box");
  minimap_text = document.getElementById("minimap-text");


  //No Antialiasing when scaling!
  ctx_minimap.mozImageSmoothingEnabled = false;
  ctx_minimap.webkitImageSmoothingEnabled = false;
  ctx_minimap.msImageSmoothingEnabled = false;
  ctx_minimap.imageSmoothingEnabled = false;

  //Bugfix really
  document.getElementsByClassName("_pointer-children_xd2n8_73")[0].style = "max-height:1px";

  toggleShow(toggle_show);
  drawBoard();
  drawCursor();
  document.getElementsByClassName("_ratio_1owdq_1")[0].parentElement.style = "position:absolute;left:158px;zoom:0.66";

  var pal = document.getElementsByClassName("_ratio_1owdq_1")[0].firstChild.firstChild;

  // Loop the color divs, add tooltips
  for (i = 0; i < 16; i++) {
    pal.childNodes[i].firstChild.title = "QERTYUIOPFGHJKLZ".substr(i, 1) + ":" + i;
  }

document.getElementById("hide-map").onclick = function () {
  audioEls.hideMap.currentTime = 0;
  audioEls.hideMap.play();
  toggleShow(false);
};
  minimap_text.onclick = function () {
  audioEls.openMap.currentTime = 0;
  audioEls.openMap.play();
  toggleShow(true);
};
  document.getElementById("settings-map").onclick = function () {
  audioEls.settings.currentTime = 0;
  audioEls.settings.play();
  document.getElementById("minimap_settings").style.display = 'block';
  document.getElementById("posyt").style.display = 'none';
};

  document.getElementById("settings-map-2").onclick = function () {
  audioEls.back.currentTime = 0;
  audioEls.back.play();
    document.getElementById("minimap_settings").style.display = 'none';
  document.getElementById("posyt").style.display = 'block';
 };
  document.getElementById("zoom-plus").addEventListener('mousedown', function (e) {
    e.preventDefault();
    zooming_in = true;
    zooming_out = false;
  audioEls.zoomIn.currentTime = 0;
  audioEls.zoomIn.play();
    zoomIn();
  }, false);

const zoomMinus = document.getElementById("zoom-minus");
if (zoomMinus) {
  zoomMinus.addEventListener('mousedown', function (e) {
    e.preventDefault();
    audioEls.zoomOut.currentTime = 0;
    audioEls.zoomOut.play();
    zooming_out = true;
    zoomOut();
  }, false);
  zoomMinus.addEventListener('mouseup', function () {
    zooming_out = false;
  }, false);
}
    const zoomPlus = document.getElementById("zoom-plus");
if (zoomPlus) {
  zoomPlus.addEventListener('mousedown', function (e) {
    e.preventDefault();
    zooming_in = true;
    zooming_out = false;
    audioEls.zoomIn.currentTime = 0;
    audioEls.zoomIn.play();
    zoomIn();
  }, false);
  zoomPlus.addEventListener('mouseup', function () {
    zooming_in = false;
  }, false);
}

  gameWindow.addEventListener('mouseup', function (evt) {
    if (!toggle_show) return;
    if (!toggle_follow) setTimeout(getCenter, 1650);
  }, false);

  gameWindow.addEventListener('mousemove', mymousemove, false);

  setInterval(updateloop, 5e3);

  updateloop();

  setInterval(function () {
    if (mousemoved) {
      mousemoved = false;
      loadTemplates();
    }
  }, 20);
setTimeout(() => {
  const Lang = localStorage.getItem("minimapLang") || "ru";
  updateLanguage(Lang);
     const infoEl = document.getElementById("infoContent");
  if (infoEl && texts.infoContent && texts.infoContent[Lang]) {
    infoEl.innerHTML = texts.infoContent[Lang];
  }
}, 100);
document.getElementById('infoButton').addEventListener('click', function(){
   audioEls.info.currentTime = 0;
   audioEls.info.play();
    var infoDiv = document.getElementById('infoContent');
    if(infoDiv.style.display === 'none' || infoDiv.style.display === ''){
      infoDiv.style.display = 'block';
    } else {
      infoDiv.style.display = 'none';
    }
  });
autoColorButton.addEventListener("click", function() {
  // 1) переключаем флаг
  autoColorEnabled = !autoColorEnabled;

  // 2) проигрываем правильный звук
  if (autoColorEnabled) audioEls.autoOn.currentTime = 0, audioEls.autoOn.play();
  else                  audioEls.autoOff.currentTime = 0, audioEls.autoOff.play();

  // 3) меняем фон (как было)
  autoColorButton.style.backgroundColor = autoColorEnabled ? "#118411" : "#000000";
  autoColorButton.style.color = "#ffffff";

  // 4) подхватываем язык (с учётом возможного null)
  const lang = (languageSelect && languageSelect.value)
                || localStorage.getItem("minimapLang")
                || "ru";

  // 5) берём правильный ключ в словаре
  const key = autoColorEnabled ? "autoColorOn" : "autoColorOff";

  // 6) ставим текст из словаря
  autoColorButton.textContent = texts[key][lang];

  console.log("Auto-Color is now " + (autoColorEnabled ? "ENABLED" : "DISABLED"));
});

}

window.addEventListener('load', function () {
  var loadInt = setInterval(() => {
    window.timerDiv = document.getElementsByClassName("_center_16o3w_14 _top_16o3w_18 _fit-content_xd2n8_34")[0].attributes;

    if (window.timerDiv.length > 0) {
      clearInterval(loadInt)

      startup();
    }
  }, 100)
}, false);
// Кнопка помощи (непрозрачная, позиция слева на одном уровне с аватаркой/меню)
const helpButton = document.createElement('div');
helpButton.id = 'helpButton';
helpButton.style.position = 'fixed';
helpButton.style.top = '5px';  // На одном уровне с аватаркой (верхний край)
helpButton.style.right = '55px';  // Слева, вместо right
helpButton.style.zIndex = '10001';
helpButton.style.background = '#888888';  // Полностью непрозрачный синий
helpButton.style.color = 'white';
helpButton.style.padding = '8px 8px';
helpButton.style.borderRadius = '0px';
helpButton.style.border = '2px solid #ffffff';
helpButton.style.cursor = 'pointer';
helpButton.style.fontSize = '22px';
helpButton.style.transition = 'background 0.3s, transform 0.3s';
helpButton.textContent = '🛟 ';
helpButton.addEventListener('mouseover', () => {
  helpButton.style.background = '#888888';  // Тёмнее при hover
  helpButton.style.transform = 'scale(1.1)';
});
helpButton.addEventListener('mouseout', () => {
  helpButton.style.background = '#888888';
  helpButton.style.transform = 'scale(1)';
});
document.body.appendChild(helpButton);

// Модальное окно (без изменений, solid white фон для читаемости)
const helpModal = document.createElement('div');
helpModal.id = 'helpModal';
helpModal.style.display = 'none';
helpModal.style.position = 'fixed';
helpModal.style.top = '50%';
helpModal.style.left = '50%';
helpModal.style.transform = 'translate(-50%, -50%)';
helpModal.style.background = '#ffffff';
helpModal.style.padding = '24px';
helpModal.style.borderRadius = '0px';
helpModal.style.boxShadow = '0px 2px rgba(0,0,0,0.3)';
helpModal.style.zIndex = '10002';
helpModal.style.maxWidth = '600px';
helpModal.style.overflowY = 'auto';
helpModal.style.maxHeight = '80vh';
helpModal.style.fontFamily = 'Arial, sans-serif';
helpModal.style.lineHeight = '1.5';
helpModal.style.color = '#333333';
document.body.appendChild(helpModal);

// Кнопка закрытия
const closeButton = document.createElement('span');
closeButton.textContent = '×';
closeButton.style.position = 'absolute';
closeButton.style.top = '10px';
closeButton.style.right = '10px';
closeButton.style.fontSize = '24px';
closeButton.style.cursor = 'pointer';
closeButton.style.color = '#aaaaaa';
closeButton.style.transition = 'color 0.3s';
closeButton.addEventListener('mouseover', () => { closeButton.style.color = '#333333'; });
closeButton.addEventListener('mouseout', () => { closeButton.style.color = '#aaaaaa'; });
closeButton.addEventListener('click', () => { helpModal.style.display = 'none'; });
helpModal.appendChild(closeButton);

// Контейнер текста
const helpContentDiv = document.createElement('div');
helpContentDiv.id = 'helpContent';
helpContentDiv.style.color = '#333333';
helpContentDiv.style.fontSize = '16px';
helpModal.appendChild(helpContentDiv);

// Обработчик клика
helpButton.addEventListener('click', () => {
  if (audioEls && audioEls.info) {
    audioEls.info.currentTime = 0;
    audioEls.info.play();
  }
  const lang = localStorage.getItem("minimapLang") || "ru";
  helpContentDiv.innerHTML = texts.helpContent[lang] || texts.helpContent["ru"];
  helpModal.style.display = 'block';
});

// Закрытие по клику вне
window.addEventListener('click', (event) => {
  if (event.target === helpModal) helpModal.style.display = 'none';
});
// === СТАБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ + МАГНИТ + ОТКРЫТИЕ (без ломания startup) ===
(function () {
  // не ломаем выполнение, ловим любые ошибки
  try {
    const LOG_PREFIX = "minimap-drag:";
    let tries = 0;

    function waitFor() {
      tries++;
      const map = document.getElementById("minimapbg");
      if (!map) {
        if (tries < 12) {
          setTimeout(waitFor, 200);
          return;
        } else {
          console.warn(LOG_PREFIX, "element #minimapbg not found — giving up");
          return;
        }
      }
      attach(map);
    }

    function attach(map) {
      if (map.__minimapDragAttached) return;
      map.__minimapDragAttached = true;

      // Надёжные CSS-основы — фиксируем поведение
      map.style.position = map.style.position || "fixed";
      map.style.zIndex = map.style.zIndex || 9999;
      map.style.touchAction = "none"; // чтобы pointer события работали плавно

      // Восстановление позиции (не ломает, если нет данных)
      try {
        const saved = JSON.parse(localStorage.getItem("minimapPosition") || "{}");
        if (saved && saved.anchor === "right") {
          map.style.right = (saved.right ?? 10) + "px";
          map.style.left = "auto";
          map.style.bottom = (saved.bottom ?? 10) + "px";
        } else if (saved && typeof saved.left === "number") {
          map.style.left = (saved.left ?? 10) + "px";
          map.style.bottom = (saved.bottom ?? 10) + "px";
          map.style.right = "auto";
        }
      } catch (e) { /* ignore */ }

      let dragging = false;
      let startX = 0, startY = 0, startLeft = 0, startBottom = 0;
      let moved = false;

      function isInteractive(node) {
        if (!node) return false;
        if (node.closest) {
          if (node.closest("#minimap_settings") || node.closest("#minimap-config") || node.closest("#minimap-config") ) return true;
          if (node.closest("button, input, select, canvas, a, label")) return true;
          if (node.closest("[data-action], [onclick], [role='button'], [tabindex]")) return true;
        }
        // fallback: tag check upward
        let el = node;
        while (el && el !== document) {
          const t = el.tagName && el.tagName.toLowerCase();
          if (["button","input","select","label","a","canvas","svg"].includes(t)) return true;
          el = el.parentElement;
        }
        return false;
      }

      map.addEventListener("pointerdown", function (ev) {
        // не начинаем перетаскивание, если кликнули по контролу внутри карты
        if (isInteractive(ev.target)) return;
        dragging = true;
        moved = false;
        startX = ev.clientX; startY = ev.clientY;
        const r = map.getBoundingClientRect();
        startLeft = r.left;
        startBottom = window.innerHeight - r.bottom;
          map.style.right = "auto";
          map.style.left = r.left + "px";
        map.setPointerCapture && map.setPointerCapture(ev.pointerId);
        map.style.cursor = "grabbing";
      }, { passive: false });

      window.addEventListener("pointermove", function (ev) {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        // Передвигаем, используя left/bottom, и снимаем right, если он был
        map.style.left = (startLeft + dx) + "px";
        map.style.bottom = (startBottom - dy) + "px";
        map.style.right = "auto";
      }, { passive: true });

      window.addEventListener("pointerup", function (ev) {
        if (!dragging) return;
        dragging = false;
        map.releasePointerCapture && map.releasePointerCapture(ev.pointerId);
        map.style.cursor = "grab";

        // Привязка к краям
        const r = map.getBoundingClientRect();
        const TH = 40;
        const nearLeft = r.left <= TH;
        const nearRight = window.innerWidth - r.right <= TH;
        const nearBottom = window.innerHeight - r.bottom <= TH;

        if (nearLeft) {
          map.style.left = "0px"; map.style.right = "auto";
        } else if (nearRight) {
          map.style.right = "0px"; map.style.left = "auto";
        }
        if (nearBottom) map.style.bottom = "0px";

        // Сохраняем позицию
        try {
          const cs = getComputedStyle(map);
          const save = {
            left: cs.left === "auto" ? undefined : parseInt(cs.left) || 0,
            right: cs.right === "auto" ? undefined : parseInt(cs.right) || 0,
            bottom: parseInt(cs.bottom) || 0,
            anchor: cs.left === "auto" ? "right" : "left"
          };
          localStorage.setItem("minimapPosition", JSON.stringify(save));
        } catch (e) { console.warn("minimap-drag: save failed", e); }

        // Если карта действительно двигалась и отпущена у края — считаем это "стуком" и открываем карту
        if (moved && (nearLeft || nearRight)) {
          try {
            // Открытие: щёлкаем элемент, который управляет показом (minimap_text открывает карту в original code)
            const openEl = document.getElementById("minimap-text") || document.getElementById("settings-map") || document.getElementById("hide-map");
            if (openEl) {
              // если карта скрыта, клик по minmap-text открывает
              openEl.click();
            } else {
              // альтернативный: вызвать toggleShow(true), если доступен
              if (typeof toggleShow === "function") toggleShow(true);
            }
          } catch (e) { /* ignore */ }
        }
      }, { passive: true });

      // При ресайзе подведём карту в зону видимости
      window.addEventListener("resize", function () {
        const r = map.getBoundingClientRect();
        let changed = false;
        if (r.right > window.innerWidth) { map.style.left = Math.max(10, window.innerWidth - r.width - 10) + "px"; map.style.right = "auto"; changed = true;}
        if (r.bottom > window.innerHeight) { map.style.bottom = "10px"; changed = true;}
        if (changed) {
          try {
            const cs = getComputedStyle(map);
            localStorage.setItem("minimapPosition", JSON.stringify({
              left: cs.left === "auto" ? undefined : parseInt(cs.left) || 0,
              right: cs.right === "auto" ? undefined : parseInt(cs.right) || 0,
              bottom: parseInt(cs.bottom) || 0,
              anchor: cs.left === "auto" ? "right" : "left"
            }));
          } catch (e) {}
        }
      });

      console.log("minimap-drag: attached and ready");
    }

    waitFor();
  } catch (err) {
    console.error("minimap-drag: unexpected error", err);
  }
})();



const sounds = {
    openMap:   "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/openMap.mp3",
    hideMap:   "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/hideMap.mp3",
    settings:  "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/settings.mp3",
    zoomIn:    "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/zoomIn.mp3",
    zoomOut:   "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/zoomOut.mp3",
    autoOn:    "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/autoOn.mp3",
    autoOff:   "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/autoOff.mp3",
    info:      "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/info.mp3",
    back:      "https://github.com/EdwardScorpio/pz-map/raw/refs/heads/main/MiniMap%20Sound/back.mp3"
};

const audioEls = {};
Object.entries(sounds).forEach(([key, url]) => {
  const a = new Audio(url);
  a.preload = "auto";
  audioEls[key] = a;
});

function mymousemove(evt) {
  if (!toggle_show || !coorDOM) return;

  var coordsXY = coorDOM.innerHTML.split(/\s?[xy:]+/);

  var x_new = parseInt(coordsXY[1]);
  var y_new = parseInt(coordsXY[2]);

  if (x != x_new || y != y_new) {
    x = x_new;
    y = y_new;

    if (toggle_follow) {
      x_window = x;
      y_window = y;
    } else {
      drawCursor();
    }
    mousemoved = 1;
  }

 if (!autoColorEnabled) return;
    setTimeout(() => {
  applyAutoColor(hoveringColor);
}, 10);
var hoveringColor = window.board.getImageData(195, 140, 1, 1).data + '';
  if (hoveringColor[3] === 0) return;

  switch (hoveringColor) {
    case '38,38,38,255': clickColor(0); break;
    case '0,0,0,255': clickColor(1); break;
    case '128,128,128,255': clickColor(2); break;
    case '255,255,255,255': clickColor(3); break;
    case '153,98,61,255': clickColor(4); break;
    case '255,163,200,255': clickColor(5); break;
    case '207,115,230,255': clickColor(6); break;
    case '128,0,128,255': clickColor(7); break;
    case '229,0,0,255': clickColor(8); break;
    case '229,137,0,255': clickColor(9); break;
    case '229,229,0,255': clickColor(10); break;
    case '150,230,70,255': clickColor(11); break;
    case '0,190,0,255': clickColor(12); break;
    case '0,230,230,255': clickColor(13); break;
    case '0,136,204,255': clickColor(14); break;
    case '0,0,230,255': clickColor(15); break;
  }
}

window.listTemplates = function () {
  var ttlpx = 0;
  var mdstr = "";
  if (!template_list) {
    console.log("### No templates. Show the minimap first");
    return;
  }

  Object.keys(template_list).map(function (index, ele) {
    var eles = template_list[index];
    if (!eles.name) return;
    var z = eles.width > 300 ? 2 : eles.width > 100 ? 4 : 8;
    var n = eles.name + "";
    if (n.indexOf("//") < 0) n = baseTemplateUrl + n;
    mdstr += '\n#### ' + index + ' ' + eles.width + 'x' + eles.height + ' ' + n;
    mdstr += ' https://pixelzone.io/?p=' + Math.floor(eles.x + eles.width / 2) + ',' + Math.floor(eles.y + eles.height / 2) + ',' + z + '\n';
    if (!isNaN(eles.width) && !isNaN(eles.height)) ttlpx += eles.width * eles.height;
  });

  mdstr = '### Total pixel count: ' + ttlpx + '\n' + mdstr;
}

function updatePixelCounter() {
  fetch('https://pixelzone.io/users/profile/me')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('pixelCounter');
      if (el) el.innerText = data.pixels;
    })
    .catch(() => {});
}

function updateloop() {
    if (!toggle_show) return;

   // Здесь мы напрямую определяем template_list, вместо загрузки из файла
 window.template_list = {
        "Map 1": {
           name: "https://i.ibb.co/qhMDfkx/2x2BIG.png",
            x: -4096,
            y: -4096,
            width: 1101,
            height: 1009
        },
        "Map 2": {
            name: "https://i.ibb.co/bgQPDg6G/image-1.png",
            x: 685,
            y: -686,
            width: 900,
            height: 1400
        },
        "new_art_3": {
            name: "https://i.ibb.co/5h87dMCg/Banknote-Arstotzka.png",
            x: 1354,
            y: 78,
            width: 200,
            height: 100
        },
        "new_art_4": {
            name: "https://i.ibb.co/ycybPX3V/dither-it-IMG-9276-11.png",
            x: 1481,
            y: -482,
            width: 260,
            height: 260
        },
        "MDOWLMAN": {
        name: "https://i.ibb.co/N6NTbKdQ/image-1.png",
        x: 1365,
        y: -51,
        width: 128,
        height: 129
         },
             "KEKISTAN": {
        name: "https://i.ibb.co/3mJQ7MfP/KEKI.png",
        x: 919,
        y: -1044,
        width: 592,
        height: 329
                  },
                  "KEKISTANI": {
        name: "https://i.ibb.co/WvLFJ8jY/STAN.png",
        x: 1511,
        y: -881,
        width: 170,
        height: 166
         },
     "NEWEST" :{
         name: "https://i.ibb.co/PGWm0BKY/dither-it-image-7.png",
         x: 1511,
         y: -881,
         width: 170,
         height: 166
     },
          "Chile" :{
         name: "https://i.ibb.co/s9RWvsDC/Chile.png",
         x: -3000,
         y: -4096,
         width: 681,
         height: 243
     },
           "2x2=4" :{
         name: "https://i.ibb.co/JjSRZCHC/01-JCYJDF1-2x2.png",
         x: -4096,
         y: -2224,
         width:1900,
         height:3435
             },
     "2x2=42" :{
         name: "https://i.ibb.co/Ld90GMt6/02-JCYJDF-2x2.png",
         x: -2447,
         y: -2224,
         width:1800,
         height:3435
             },
          "NEWEST" :{
         name: "https://i.ibb.co/ZR17xqtt/Yfit-hflbj.png",
         x: -3408,
         y: -2589,
         width:237,
         height: 228
     },
          "ANEWEST" :{
         name: "https://i.ibb.co/Kp7pqL6k/image.png",
         x: 1481,
         y: -710,
         width:240,
         height: 230
     },
              "NIGDEGOROD" :{
         name: "https://i.ibb.co/vC3XQ9Xd/Nigdegorod.png",
         x: -2666,
         y: -2345,
         width:463,
         height: 350
     },
                   "DOCTOR" :{
         name: "https://i.ibb.co/CpN8tgnS/image.png",
         x: -2666,
         y: -2713,
         width:400,
         height: 400
     },
     "YANENE" :{
         name: "https://i.ibb.co/YFpzsJ5g/Pixel-Zone244.png",
         x: -535,
         y: -3562,
         width: 244,
         height:244
         },
      "YANE" :{
         name: "https://i.ibb.co/3mQ48K7s/kek4chan.png",
         x: 1511,
         y: -1044,
         width: 272,
         height:200
         },
     "Passports":{
         name: "https://i.ibb.co/h6V4VPR/image.png",
         x: 1460,
         y: 189,
         width: 250,
         height:700
         },
     "Photography" :{
     name:"https://i.ibb.co/bj8mJT3T/image.png",
         x: 1364,
         y: -211,
         width: 176,
         height:176
              },
   "Paper" :{
     name:"https://i.ibb.co/WpD3M0hF/image.png",
         x:1493,
         y:-24,
         width: 275,
         height:225
     },
     "Frogland":{
              name:"https://i.ibb.co/ccXZPYHF/image.png",
         x:1291,
         y:-948,
         width: 100,
         height:100
     },
     "Scarf" :{
         name:"https://i.ibb.co/rR8NrG8Z/image.png",
         x:1729,
         y:-656,
         width:300,
         height:422
     },
   "Kekifrogs" :{
     name:"https://i.ibb.co/Kp2cYjT9/KEKISTAN.png",
     x:921,
     y:-915,
     width:323,
     height:41
 },
"NewArst"     :{
     name:"https://i.ibb.co/Q4rL6p3/image.png",
     x:1881,
     y:-854,
     width:224,
     height:356
},
     "Coulone" :{
     name:"https://i.ibb.co/LhgQ83B3/image.png",
     x:1543,
     y:78,
     width:80,
     height:70,
     },
     "SHY" :{
name:"https://i.ibb.co/4QyYLC3/image.png",
         x:1664,
         y:-50,
         width:150,
         height:85
     },
     "Shheeep":{
         name:"https://i.ibb.co/5xk2dhCj/image.png",
         x:918,
         y:-717,
         width:350,
         height:220,
     },
     "ForTea" :{
         name:"https://i.ibb.co/n8chJzMG/image.png",
         x:921,
         y:-982,
         width: 75,
         height: 80
     },
          "This Italy":{
    name:"https://i.ibb.co/C5QCmS8Z/image-4.png",
     x:-449,
     y:-449,
     width: 1300,
     height:880,
     },
    };
    if (!toggle_follow) getCenter();

    image_list = [];
    loadTemplates();
    updatePixelCounter();
}

function toggleShow(newValue) {
  if (newValue === undefined) toggle_show = !toggle_show;
  else toggle_show = newValue;
  if (!minimap_box) return;
  if (toggle_show) {
    minimap_box.style.display = "block";
    minimap_text.style.display = "none";
    document.getElementById("minimap-config").style.display = "block";
    loadTemplates();
  } else {
    minimap_box.style.display = "none";
    const Lang = localStorage.getItem("minimapLang") || "ru";
    minimap_text.innerHTML = texts.openText[Lang] || "ОТКРЫТЬ МИНИ-КАРТУ";
    minimap_text.style.display = "block";
    minimap_text.style.cursor = "pointer";
    document.getElementById("minimap-config").style.display = "none";
  }
  var g = document.getElementsByClassName("grecaptcha-badge");
  if (g[0]) g[0].style.display = "none";
}
function zoomIn() { if (!zooming_in) return; // Увеличиваем и жёстко ограничиваем сверху
                   zoomlevel = Math.min(45, zoomlevel * 1.03); drawBoard(); drawCursor(); loadTemplates(); // Если мы достигли лимита — остановим цикл и сбросим флаг
                   if (zoomlevel >= 45) { zooming_in = false; return; } setTimeout(zoomIn, zoom_time); }
function zoomOut() { if (!zooming_out) return; // Уменьшаем и ограничиваем снизу
                   zoomlevel = Math.max(1, zoomlevel / 1.03); drawBoard(); drawCursor(); loadTemplates();
                    if (zoomlevel <= 1) { zooming_out = false; return; } drawBoard(); drawCursor();
                   loadTemplates(); setTimeout(zoomOut, zoom_time); }


function loadTemplates() {
  if (!toggle_show) return;
  if (window.template_list == null || !minimap_box) return;
  var keys = Object.keys(template_list);

  needed_templates = [];

  keys.forEach(item => {
    if (!template_list[item].width) return;
    var temp_x = template_list[item].x;
    var temp_y = template_list[item].y;
    var temp_xr = temp_x + template_list[item].width;
    var temp_yb = temp_y + template_list[item].height;
    if (!x_window.between(temp_x - range, temp_xr + range)) return;
    if (!y_window.between(temp_y - range, temp_yb + range)) return;
    needed_templates.push(item);
  })

  for (var i = 0; i < keys.length; i++) {
    var template = keys[i];
    if (!template_list[template].width) continue;
    var temp_x = template_list[template].x;
    var temp_y = template_list[template].y;
    var temp_xr = temp_x + template_list[template].width;
    var temp_yb = temp_y + template_list[template].height;
    if (!x_window.between(temp_x - range, temp_xr + range)) continue;
    if (!y_window.between(temp_y - range, temp_yb + range)) continue;

    needed_templates.push(template);
  }

  if (needed_templates.length == 0) {
    if (zooming_in == false && zooming_out == false) {
      minimap_box.style.display = "none";
      minimap_text.style.display = "block";
  const Lang = localStorage.getItem("minimapLang") || "ru";
minimap_text.innerHTML = texts.emptyTemplates[Lang] || texts.emptyTemplates["ru"];
      minimap_text.style.cursor = "auto";
    }
  } else {
    minimap_box.style.display = "block";
    minimap_text.style.display = "none";
    counter = 0;
    for (i = 0; i < needed_templates.length; i++) {
      if (image_list[needed_templates[i]] == null) {
        loadImage(needed_templates[i]);
      } else {
        counter += 1;
        if (counter == needed_templates.length) drawTemplates();
      }
    }
  }
}

function loadImage(imagename) {
  console.log("Load image" + imagename,);

  image_list[imagename] = new Image();
  var src = template_list[imagename].name;
  if (cachebreaker) src += "?" +cachebreaker;

  image_list[imagename].crossOrigin = "Anonymous";
  image_list[imagename].src = src;

  image_list[imagename].onload = function () {
    counter += 1;

    if (counter == needed_templates.length) drawTemplates();
  }
}

function drawTemplates() {
  ctx_minimap.clearRect(0, 0, minimap.width, minimap.height);
  var x_left = x_window * 1 - minimap.width / zoomlevel / 2;
  var y_top = y_window * 1 - minimap.height / zoomlevel / 2;
  for (var i = 0; i < needed_templates.length; i++) {
    var template = needed_templates[i];
    var xoff = (template_list[template].x * 1 - x_left * 1) * zoomlevel;
    var yoff = (template_list[template].y * 1 - y_top * 1) * zoomlevel;
    var newwidth = zoomlevel * image_list[template].width;
    var newheight = zoomlevel * image_list[template].height;
    ctx_minimap.drawImage(image_list[template], xoff, yoff, newwidth, newheight);
    console.log();
  }
}

let drawGrid = false;

function drawBoard() {
  if (!ctx_minimap_board || !minimap_board || !minimap) return;

  ctx_minimap_board.clearRect(0, 0, minimap_board.width, minimap_board.height);
  if (!drawGrid || zoomlevel <= 4.6) return;

  const z = zoomlevel;
  const bw = minimap_board.width + z;
  const bh = minimap_board.height + z;

  // Центрирование сетки по центру миникарты
  const xoff_m = -((minimap.width / 2) - (z / 2));
  const yoff_m = -((minimap.height / 2) - (z / 2));

  ctx_minimap_board.beginPath();
  ctx_minimap_board.lineWidth = 0.2;

  for (let x = 0; x <= bw; x += z) {
    ctx_minimap_board.moveTo(x + xoff_m, yoff_m);
    ctx_minimap_board.lineTo(x + xoff_m, bh + yoff_m);
  }
  for (let y = 0; y <= bh; y += z) {
    ctx_minimap_board.moveTo(xoff_m, y + yoff_m);
    ctx_minimap_board.lineTo(bw + xoff_m, y + yoff_m);
  }

  ctx_minimap_board.strokeStyle = "white";
  ctx_minimap_board.stroke();
}

(function () {
  const interval = setInterval(() => {
    const gridCheckbox = document.getElementById("toggleGrid");
    const labelText = document.getElementById("gridLabelText");

    if (gridCheckbox && labelText) {
      // Восстановление предыдущего состояния (если хочешь, добавим localStorage позже)
      gridCheckbox.checked = drawGrid;

      // Перевод надписи
      const lang = localStorage.getItem("minimapLang") || "ru";
      labelText.textContent = texts.showGrid[lang] || texts.showGrid["ru"];

      // Обработчик
      gridCheckbox.addEventListener("change", () => {
        drawGrid = gridCheckbox.checked;
        drawBoard();
      });

      clearInterval(interval);
    }
  }, 100);
})();

function drawCursor() {
  var x_left = x_window * 1 - minimap.width / zoomlevel / 2;
  var x_right = x_window * 1 + minimap.width / zoomlevel / 2;
  var y_top = y_window * 1 - minimap.height / zoomlevel / 2;
  var y_bottom = y_window * 1 + minimap.height / zoomlevel / 2;

  ctx_minimap_cursor.clearRect(0, 0, minimap_cursor.width, minimap_cursor.height);

  if (x < x_left || x > x_right || y < y_top || y > y_bottom) return;

  var xoff_c = x - x_left;
  var yoff_c = y - y_top;

  ctx_minimap_cursor.beginPath();
  ctx_minimap_cursor.lineWidth = zoomlevel / 6;
  ctx_minimap_cursor.strokeStyle = "#ff1bfc";
  ctx_minimap_cursor.rect(zoomlevel * xoff_c, zoomlevel * yoff_c, zoomlevel, zoomlevel);
  ctx_minimap_cursor.stroke();

  window.board = ctx_minimap;
}

function getCenter() {
  var s = window.location.search.split(",");
  var cx = parseInt(s[0].split("=")[1]), cy = parseInt(s[1]);

  x_window = cx;
  y_window = cy;

  loadTemplates();
}
window.addEventListener('keydown', function (e) {
  switch (e.keyCode) {
    case 32: //space
      toggleShow();

      if (toggle_show) {
        window.cachebreaker++;
        console.log(cachebreaker);
        updateloop();
      }
      mymousemove();
    break;
    case 81: clickColor(0); break;
    case 69: clickColor(1); break;
    case 82: clickColor(2); break;
    case 84: clickColor(3); break;
    case 89: clickColor(4); break;
    case 85: clickColor(5); break;
    case 73: clickColor(6); break;
    case 79: clickColor(7); break;
    case 80: clickColor(8); break;
    case 70: clickColor(9); break;
    case 71: clickColor(10); break;
    case 72: clickColor(11); break;
    case 74: clickColor(12); break;
    case 75: clickColor(13); break;
    case 76: clickColor(14); break;
    case 192:
    case 90: clickColor(15); break;
    case 87: //WASD
    case 65:
    case 83:
    case 68:
      break;
    case 107: //numpad +
      zooming_in = true;
      zooming_out = false;
      zoomIn();
      zooming_in = false;
      break;
    case 109: //numpad -
      zooming_out = true;
      zooming_in = false;
      zoomOut();
      zooming_out = false;
      break;
    case 88: //x: hide more elements
      var UIDiv = document.getElementById("upperCanvas").nextElementSibling;
      var menu = UIDiv.childNodes[4];
      var playercount = UIDiv.childNodes[3].childNodes[0];
      var coords = playercount.nextElementSibling;
      if(menu.style.display != "none") {
        menu.style.display = "none";
      } else if(playercount.style.display != "none"){ //hide counter
        playercount.style.display = "none";
      } else {
        coords.style.display = "none";
      }
      break;
 case 187: // клавиша "="
    zooming_in = true;
    zooming_out = false;
    zoomIn();
    zooming_in = false;
    break;
  case 189: // клавиша "-"
    zooming_out = true;
    zooming_in = false;
    zoomOut();
    zooming_out = false;
    break;
case 48: // клавиша "0"
  document.getElementById('autoColor').checked = !document.getElementById('autoColor').checked;
  break;
  case 57: // клавиша "9"
      document.getElementById("check-updates").click();
      break;
    default:
      console.log("keydown", e.keyCode, e.key);
  }
});

function clickColor(c) {
  var pal = document.getElementsByClassName("_ratio_1owdq_1")[0].firstChild.firstChild;
  //https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
  var e = new MouseEvent("click", {
    clientX: 5, clientY: 5,
    bubbles: true
  });
  pal.childNodes[c].firstChild.dispatchEvent(e);
}

function setCookie(name, value) { //you can supply "minutes" as 3rd arg.
  var argv = setCookie.arguments;
  var argc = setCookie.arguments.length;
  var minutes = (argc > 2) ? argv[2] : 720 * 1440; //default 720 days
  var date = new Date();
  date.setTime(date.getTime() + (minutes * 60 * 1000));
  var expires = "";
  if (minutes > 0) expires = "; Expires=" + date.toGMTString();
  document.cookie = name + "=" + value + expires + "; SameSite=Lax; Path=/";
}
window.setCookie = setCookie;

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

let isCheckingForUpdates = false;

function checkForUpdates(silent = false) {
    if (isCheckingForUpdates) return;
    isCheckingForUpdates = true;

    const updateURL = "https://raw.githubusercontent.com/EdwardScorpio/pz-map/main/PBteam-map-2.0.user.js";
    const lang = localStorage.getItem("minimapLang") || "ru";

    fetch(updateURL)
        .then(response => response.text())
        .then(data => {
            const remoteVersion = data.match(/@version\\s+(\\S+)/);
            const currentVersion = GM_info.script.version;

            if (remoteVersion && compareVersions(remoteVersion[1], currentVersion) > 0) {
                if (confirm(texts.updateAvailable[lang] || texts.updateAvailable["ru"])) {
                    window.open(updateURL, "_blank");
                }
            } else if (!silent) {
                alert(texts.noUpdates[lang] || texts.noUpdates["ru"]);
            }
        })
        .catch(error => {
            console.error((texts.updateError[lang] || texts.updateError["ru"]) + ":", error);
        })
        .finally(() => {
            isCheckingForUpdates = false;
        });
}
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    return 0;
}

function addUpdateCheckListener() {
  const checkUpdatesButton = document.getElementById('check-updates');
  if (checkUpdatesButton) {
    checkUpdatesButton.addEventListener('click', function() {
      checkForUpdates(false);
    });
  } else {
    console.error('Check Updates button not found');
  }
}
const texts = {
  hideMap: {
    ru: "Скрыть", en: "Hide", es: "Ocultar", tr: "Gizle", fi: "Piilota",
    fr: "Сeler", pt: "Ocultar", sv: "Dölj", kk: "Жасыру", it: "Celare"
  },
  settings: {
    ru: "Настройки", en: "Settings", es: "Ajustes", tr: "Ayarlar", fi: "Asetukset",
    fr: "Réglage", pt: "Ajustar", sv: "Justera", kk: "Орнату", it:"Regolare"
  },
  openText: {
    ru: "ОТКРЫТЬ МИНИ-КАРТУ", en: "OPEN MINIMAP", es: "ABRIR MINIMAPA", tr: "MİNİ HARİTA AÇ", fi: "AVAA PIIRROS",
    fr: "OUVRIR MINICARTE", pt: "ABRIR MINIMAPA", sv: "ÖPPNA MINIKARTA", kk: "МИНИ-КАРТАНЫ АШУ", it:"APRI MINI-MAPPA"
  },
  autoColorOn: {
    ru: "Aвто-цвет", en: "Auto-Color", es: "Auto-Color", tr: "Otomat-Renk", fi: "Autoväri",
    fr: "Auto-couleur", pt: "Auto-Cor", sv: "Auto-färg", kk: "Авто-түстер", it: "Auto-color"
  },
  autoColorOff: {
    ru: "Авто-цвет", en: "Auto-Color", es: "Auto-Color", tr: "Otomat-Renk", fi: "Autoväri",
    fr: "Auto-couleur", pt: "Auto-Cor", sv: "Auto-färg", kk: "Авто-түстер", it: "Auto-color"
  },
  back: {
    ru: "Вернуться", en: "Back", es: "Volver", tr: "Geri", fi: "Takaisin",
    fr: "Retour", pt: "Voltar", sv: "Tillbaka", kk: "Артқа", it: "Indietro"
  },
  updates: {
    ru: "Обновления", en: "Updates", es: "Actualizaciones", tr: "Güncellemeler", fi: "Päivitykset",
    fr: "Mises à jour", pt: "Atualizações", sv: "Uppdateringar", kk: "Жаңартулар", it:"Aggiornamenti",
  },
  info: {
    ru: "Информация", en: "Info", es: "Info", tr: "Bilgi", fi: "Info",
    fr: "Info", pt: "Info", sv: "Info", kk: "Ақпарат", it:"Info"
  },
  volume: {
      ru:"Звук", en:"Volume", es:"Volumen", tr:"Ses", fi:"Äänenvoim",
      fr:"Volume", pt:"Volume",sv:"Volym",kk:"Дыбыс", it:"Suono"
  },
  settingsTitle:{
      ru:"Настройки Мини-Карты", en:"Minimap Settings", es:"Configuración del minimapa", tr:"Mini Harita Ayarları", fi:"Pienikartan asetukset",
      fr:"Paramètres de la mini-carte", pt:"Configurações do minimapa", sv:"Minikarta inställningar", kk:"Мини-карта баптаулары", it:"Impostazioni Mini-Mappa" },
    infoContent: {
    ru: " <p>Привет фанат телеканала 2х2! <p>Данная мини-карта сделана специально для тебя!</p> <p>Благодарности:</p> <ul> <li>Edward Scorpio — генерал Пиксельных войн</li> <li>Ultimate Pekar — генерал Пиксельных войн</li> <li>MDOwlman — генерал-коменданторе</li> </ul> <p>Карта создана 18 сентября 2024 года.</p>",
    en: " <p>Hello 2x2 TV fan! This minimap was made just for you!</p> <p>Acknowledgements:</p> <ul> <li>Edward Scorpio — Pixel Wars General</li> <li>Ultimate Pekar — Pixel Wars General</li> <li>MDOwlman — Grand Commander</li></ul> <p>Map officially created on September 18, 2024.</p>",
    es: "<p>¡Hola fan de 2x2 TV! ¡Este minimapa fue creado especialmente para ti!</p> <p>Agradecimientos:</p> <ul> <li>Edward Scorpio — General de las Guerras de Píxeles</li> <li>Ultimate Pekar — General de las Guerras de Píxeles</li> <li>MDOwlman — Gran Comandante</li></ul> <p>El mapa fue creado oficialmente el 18 de septiembre de 2024.</p>",
    tr: "<p>2x2 TV hayranı merhaba! Bu minimap tam sana göre yapıldı!</p> <p>Teşekkürler:</p> <ul> <li>Edward Scorpio — Piksel Savaşları Generali</li> <li>Ultimate Pekar — Piksel Savaşları Generali</li> <li>MDOwlman — Büyük Komutan</li> </ul> <p>Harita resmi olarak 18 Eylül 2024 tarihinde oluşturuldu.</p>",
    fi: "<p>Hei 2x2 TV:n fani! <p>Tämä minimappi on tehty juuri sinua varten!</p> <p>Kiitokset:</p> <ul> <li>Edward Scorpio — Pikselisotien kenraali</li><li>Ultimate Pekar — Pikselisotien kenraali</li><li>MDOwlman — Suuri komentaja</li> </ul> <p>Kartta luotiin virallisesti 18. syyskuuta 2024.</p>",
    fr: "<p>Bonjour fan de la chaîne 2x2 ! <p>Cette minicarte a été créée spécialement pour toi !</p> <p>Remerciements :</p> <ul> <li>Edward Scorpio — Général des Guerres de Pixels</li><li>Ultimate Pekar — Général des Guerres de Pixels</li><li>MDOwlman — Grand Commandant</li></ul> <p>La carte a été officiellement créée le 18 septembre 2024.</p>",
    pt: "<p>Olá fã do canal 2x2 ! <p> Este minimapa foi feito especialmente para você!</p> <p>Agradecimentos:</p> <ul> <li>Edward Scorpio — General das Guerras de Pixels</li> <li>Ultimate Pekar — General das Guerras de Pixels</li> <li>MDOwlman — Grande Comandante</li> </ul> <p>O mapa foi criado oficialmente em 18 de setembro de 2024.</p>",
    sv: " <p> Hej 2x2 TV-fan! Denna minimap har skapats speciellt för dig!</p> <p>Tack till:</p> <ul> <li>Edward Scorpio — General för Pixelkrigen</li> <li>Ultimate Pekar — General för Pixelkrigen</li><li>MDOwlman — Stor kommendant</li></ul> <p>Kartan skapades officiellt den 18 september 2024.</p>",
    kk:"<p>2x2 телеканалының жанкүйері, сәлем! <p>Бұл мини-карта дәл сіз үшін жасалды!</p> <p>Рақмет:</p><ul> <li>Edward Scorpio — Пиксель соғыстары генералы</li><li>Ultimate Pekar — Пиксель соғыстары генералы</li><li>MDOwlman — Бас қолбасшы</li></ul><p>Карта ресми түрде 2024 жылғы 18 қыркүйекте жасалған.</p>",
         it: "<p>Ciao fan di 2x2!</p><p>Questa mini-mappa è stata creata apposta per te!</p><p>Questa mini-mappa è stata realizzata grazie alle seguenti persone:</p> <p>Generale delle guerre pixel Edward Scorpio</p><p>Generale delle guerre pixel Ultimate Pekar</p> <p>Generale-Comandante MDOwlman</p><p>Questa mappa è stata creata ufficialmente il 18 settembre 2024.</p>"
    },
    language: {
    ru: "Язык",
    en: "Language",
    es: "Idioma",
    tr: "Dil",
    fi: "Kieli",
    fr: "Langue",
    pt: "Idioma",
    sv: "Språk",
    kk: "Тіл",
    it: "Lingua"
  },
  mode: {
    ru: "Режим",
    en: "Mode",
    es: "Modo",
    tr: "Mod",
    fi: "Tila",
    fr: "Mode",
    pt: "Modo",
    sv: "Läge",
    kk: "Режим",
    it: "Lingua",
  },
    version: {
    ru: "Версия", en: "Version", es: "Versión", tr: "Sürüm", fi: "Versio",
    fr: "Version", pt: "Versão", sv: "Version", kk: "Нұсқа", it: "Versione",
},
    updateAvailable: {
    ru: "Доступна новая версия скрипта. Хотите обновить?",
    en: "A new version of the script is available. Would you like to update?",
    es: "Hay una nueva versión del script. ¿Desea actualizar?",
    tr: "Yeni bir betik sürümü mevcut. Güncellemek ister misiniz?",
    fi: "Uusi skriptiversio on saatavilla. Haluatko päivittää?",
    fr: "Une nouvelle version du script est disponible. Voulez-vous mettre à jour ?",
    pt: "Uma nova versão do script está disponível. Deseja atualizar?",
    sv: "En ny version av skriptet är tillgänglig. Vill du uppdatera?",
    kk: "Скриптің жаңа нұсқасы қолжетімді. Жаңартқыңыз келе ме?",
    it: "È disponibile una nuova versione dello script. Vuoi aggiornare?"
  },
  noUpdates: {
    ru: "У вас установлена последняя версия скрипта. Обновлений нет.",
    en: "You have the latest version of the script. No updates.",
    es: "Ya tiene instalada la última versión del script. No hay actualizaciones.",
    tr: "Scriptin en son sürümü yüklü. Güncelleme yok.",
    fi: "Sinulla on uusin skriptiversio. Ei päivityksiä.",
    fr: "Vous avez la dernière version du script. Pas de mises à jour.",
    pt: "Você já possui a versão mais recente do script. Nenhuma atualização.",
    sv: "Du har den senaste versionen av skriptet. Inga uppdateringar.",
    kk: "Сізде скриптің соңғы нұсқасы орнатылған. Жаңартулар жоқ.",
    it: "Hai l'ultima versione dello script installata. Non ci sono aggiornamenti."
  },
  updateError: {
    ru: "Ошибка при проверке обновлений",
    en: "Error checking for updates",
    es: "Error al comprobar actualizaciones",
    tr: "Güncellemeler kontrol edilirken hata oluştu",
    fi: "Virhe tarkistettaessa päivityksiä",
    fr: "Erreur lors de la vérification des mises à jour",
    pt: "Erro ao verificar atualizações",
    sv: "Fel vid kontroll av uppdateringar",
    kk: "Жаңартуларды тексеру кезінде қате орын алды",
    it: "Errore durante il controllo degli aggiornamenti"
  },
   emptyTemplates: {
    ru: "Пусто. Здесь трафаретов пока нет.",
    en: "Empty. No templates here yet.",
    es: "Vacío. Aún no hay plantillas aquí.",
    tr: "Boş. Burada henüz şablon yok.",
    fi: "Tyhjä. Täällä ei vielä ole mallipohjia.",
    fr: "Vide. Aucun modèle ici pour l'instant.",
    pt: "Vazio. Ainda não há modelos aqui.",
    sv: "Tomt. Inga mallar här ännu.",
    kk: "Бос. Әзірге мұнда үлгілер жоқ.",
    it:"Essere vuoto. Non ci sono ancora stencil qui."
  },
    versionTitle: {
  ru: "=2X2 МИНИ-КАРТА=",
  en: "=2X2 MINIMAP=",
  es: "=2X2 MINI MAPA=",
  tr: "=2X2 MİNİ HARİTA=",
  fi: "=2X2 MINIKARTTA=",
  fr: "=2X2 MINI-CARTE=",
  pt: "=2X2 MINI MAPA=",
  sv: "=2X2 MINIKARTA=",
  kk: "=2X2 МИНИ-КАРТА=",
  it: "=2X2 MINI-MAPPA="
    },
  showGrid: {
    ru: "Показывать сетку",
    en: "Show Grid",
    es: "Mostrar cuadrícula",
    tr: "Izgara Göster",
    fi: "Näytä ruudukko",
    fr: "Afficher la grille",
    pt: "Mostrar grade",
    sv: "Visa rutnät",
    kk: "Тор көзін көрсету"
  },
    zoomLevelLabel: {
    ru: "Масштаб", en: "Zoom", es: "Zoom", tr: "Yakınlaştırma",
    fi: "Zoom", fr: "Zoom", pt: "Zoom", sv: "Zoom", kk: "Масштаб"
    },
    helpContent: {
  ru: "<h2>Полезная информация о мини-карте</h2><p>Мини-карта для Pixel Battle Team Crew в pixelzone.io.</p><p><b>Инструкции:</b> Шаблоны загружаются автоматически.</p><p><b>Клавиши:</b><ul><li>Пробел: Показать/скрыть карту (обновляет шаблоны).</li><li>QERTYUIOP FGHJKLZ: Выбор цвета.</li><li>+/- (numpad или =/-): Масштаб.</li><li>0: Авто-выбор цвета.</li><li>9: Проверить обновления.</li></ul></p><p>Карта стартует скрытой — открой её пробелом. Благодарности: Edward Scorpio, Ultimate Pekar, MDOwlman. Создана 18.09.2024.</p>",
  en: "<h2>Useful Minimap Info</h2><p>Minimap for Pixel Battle Team Crew on pixelzone.io.</p><p><b>Instructions:</b>Templates load automatically.</p><p><b>Keys:</b><ul><li>Space: Show/hide map (reloads templates).</li><li>QERTYUIOP FGHJKLZ: Select color.</li><li>+/- (numpad or =/-): Zoom.</li><li>0: Toggle auto-color.</li><li>9: Check updates.</li></ul></p><p>Map starts hidden — open with space. Thanks to: Edward Scorpio, Ultimate Pekar, MDOwlman. Created 09/18/2024.</p>",
  es: "<h2>Información útil del minimapa</h2><p>Minimapa para Pixel Battle Team Crew en pixelzone.io.</p><p><b>Instrucciones:</b> Las plantillas se cargan automáticamente.</p><p><b>Teclas:</b><ul><li>Espacio: Mostrar/ocultar mapa (recarga plantillas).</li><li>QERTYUIOP FGHJKLZ: Seleccionar color.</li><li>+/- (numpad o =/-): Zoom.</li><li>0: Alternar auto-color.</li><li>9: Verificar actualizaciones.</li></ul></p><p>El mapa inicia oculto — ábrelo con espacio. Gracias a: Edward Scorpio, Ultimate Pekar, MDOwlman. Creado el 18/09/2024.</p>",
  tr: "<h2>Yararlı Minimapa Bilgileri</h2><p>Pixel Battle Team Crew için pixelzone.io minimapası.</p><p><b>Talimatlar:</b> Şablonlar otomatik yüklenir.</p><p><b>Tuştar:</b><ul><li>Boşluk: Haritayı göster/gizle (şablonları yeniler).</li><li>QERTYUIOP FGHJKLZ: Renk seç.</li><li>+/- (numpad veya =/-): Yakınlaştır.</li><li>0: Otomatik renk değiştir.</li><li>9: Güncellemeleri kontrol et.</li></ul></p><p>Harita gizli başlar — boşlukla aç. Teşekkürler: Edward Scorpio, Ultimate Pekar, MDOwlman. Oluşturuldu: 18.09.2024.</p>",
  fi: "<h2>Hyödyllistä minimap-tietoa</h2><p>Minimappi Pixel Battle Team Crew'lle pixelzone.io:ssa.</p><p><b>Ohjeet:</b> Mallit latautuvat automaattisesti.</p><p><b>Näppäimet:</b><ul><li>Välilyönti: Näytä/piilota kartta (päivittää mallit).</li><li>QERTYUIOP FGHJKLZ: Valitse väri.</li><li>+/- (numpad tai =/-): Zoomaa.</li><li>0: Vaihda automaattinen väri.</li><li>9: Tarkista päivitykset.</li></ul></p><p>Kartta alkaa piilotettuna — avaa välilyönnillä. Kiitos: Edward Scorpio, Ultimate Pekar, MDOwlman. Luotu 18.09.2024.</p>",
  fr: "<h2>Informations utiles sur la minicarte</h2><p>Minicarte pour Pixel Battle Team Crew sur pixelzone.io.</p><p><b>Instructions :</b> Les modèles se chargent automatiquement.</p><p><b>Touches :</b><ul><li>Espace : Afficher/masquer la carte (recharge les modèles).</li><li>QERTYUIOP FGHJKLZ : Sélectionner la couleur.</li><li>+/- (numpad ou =/-) : Zoom.</li><li>0 : Basculer auto-couleur.</li><li>9 : Vérifier les mises à jour.</li></ul></p><p>La carte commence masquée — ouvrez-la avec espace. Merci à : Edward Scorpio, Ultimate Pekar, MDOwlman. Créée le 18/09/2024.</p>",
  pt: "<h2>Informações úteis do minimapa</h2><p>Minimapa para Pixel Battle Team Crew no pixelzone.io.</p><p><b>Instruções:</b> Modelos carregam automaticamente.</p><p><b>Teclas:</b><ul><li>Espaço: Mostrar/ocultar mapa (recarrega modelos).</li><li>QERTYUIOP FGHJKLZ: Selecionar cor.</li><li>+/- (numpad ou =/-): Zoom.</li><li>0: Alternar auto-cor.</li><li>9: Verificar atualizações.</li></ul></p><p>O mapa inicia oculto — abra com espaço. Obrigado a: Edward Scorpio, Ultimate Pekar, MDOwlman. Criado em 18/09/2024.</p>",
  sv: "<h2>Användbar minimapkarta-info</h2><p>Minimap för Pixel Battle Team Crew på pixelzone.io.</p><p><b>Instruktioner:</b> Mallar laddas automatiskt.</p><p><b>Tangenter:</b><ul><li>Mellanslag: Visa/dölj karta (uppdaterar mallar).</li><li>QERTYUIOP FGHJKLZ: Välj färg.</li><li>+/- (numpad eller =/-): Zooma.</li><li>0: Växla auto-färg.</li><li>9: Kontrollera uppdateringar.</li></ul></p><p>Kartan startar dold — öppna med mellanslag. Tack till: Edward Scorpio, Ultimate Pekar, MDOwlman. Skapad 18.09.2024.</p>",
  kk: "<h2>Мини-карта туралы пайдалы ақпарат</h2><p>Pixel Battle Team Crew үшін pixelzone.io мини-картасы.</p><p><b>Нұсқаулар:</b> Үлгілер автоматты түрде жүктеледі.</p><p><b>Пернелер:</b><ul><li>Бос орын: Картаны көрсету/жасыру (үлгілерді жаңартады).</li><li>QERTYUIOP FGHJKLZ: Түсті таңдау.</li><li>+/- (numpad немесе =/-): Масштабтау.</li><li>0: Авто-түс ауыстыру.</li><li>9: Жаңартуларды тексеру.</li></ul></p><p>Карта жасырын басталады — бос орынмен ашыңыз. Рақмет: Edward Scorpio, Ultimate Pekar, MDOwlman. Жасалған: 18.09.2024.</p>",
  it:"<h2>Informazioni utili sulla mini-mappa</h2><p>Mini-mappa per Pixel Battle Team Crew su pixelzone.io.</p><p><b>Istruzioni:</b> I template vengono caricati automaticamente.</p><p><b>Tasti:</b><ul><li>Spazio:Mostra/nasconde la mappa (aggiorna i template).</li><li>QERTYUIOP FGHJKLZ: Selezione del colore.</li><li>+/- (tastierino numerico oppure =/-): Zoom.</li><li>0: Selezione automatica del colore.</li><li>9: Controllare gli aggiornamenti.</li></ul></p><p>La mappa è inizialmente nascosta — aprila con la barra spaziatrice.Ringraziamenti: Edward Scorpio, Ultimate Pekar, MDOwlman.Creata il 18.09.2024.</p>"
},
    helpButton: {
    ru: "Помощь",
    en: "Help",
    es: "Ayuda",
    tr: "Yardım",
    fi: "Apua",
    fr: "Aide",
    pt: "Ajuda",
    sv: "Hjälp",
    kk: "Көмек",
    it:"Assistenza"
}
};

function updateLanguage(lang) {
  const applyText = (id, key) => {
    const el = document.getElementById(id);
    if (el && texts[key]) {
      const translation = texts[key][lang] || texts[key]["RU"]; // если нет языка, берём русский
      if (id === "versionLabel") {
        el.textContent = `${translation}: ${MINIMAP_VERSION}`;
      } else {
        el.textContent = translation;
      }
        setInterval(updateloop, 5000)
    }
      vers = texts.versionTitle[lang] || "=2X2 МИНИ-КАРТА=";
document.getElementById("minimap-title").textContent = vers;

  };
  applyText("hide-map", "hideMap");
  applyText("settings-map", "settings");
  applyText("minimap-text", "openText");
  applyText("autoColorButton", typeof autoColorEnabled !== "undefined" && autoColorEnabled ? "autoColorOn" : "autoColorOff");
  applyText("settings-map-2", "back");
  applyText("check-updates", "updates");
  applyText("infoButton", "info");
  applyText("transparencyLabel", "transparency");
  applyText("volumeLabel", "volume");
  applyText("settings-title", "settingsTitle");
  applyText("languageLabel", "language");
  applyText("modeLabel", "modeLabel");
  applyText("versionLabel", "version");
  applyText("minimap-text", "emptyTemplates");
  applyText("minimap-text", "openText");
  applyText("gridLabelText", "showGrid");
  applyText("helpButton");
}
const infoTextEl = document.getElementById("infoText");
if (infoTextEl && texts.infoContent && texts.infoContent[lang]) {
  infoTextEl.innerHTML = texts.infoContent[lang];
}
document.addEventListener("DOMContentLoaded", function () {
  const languageSelect = document.getElementById("languageSelect");
  const Lang = localStorage.getItem("minimapLang") || "ru";
  if (languageSelect) {
    languageSelect.value = Lang;
    updateLanguage(Lang);
    languageSelect.addEventListener("change", () => {
      const lang = languageSelect.value;
      localStorage.setItem("minimapLang", lang);
      updateLanguage(lang);
    });
  }
    document.getElementById("infoButton").addEventListener("click", () => {
  const lang = localStorage.getItem("minimapLang") || "ru";
  updateLanguage(lang);
  setInterval(updateloop, 5000)
});
});
    setTimeout(() => {
    updateLanguage(Lang);
  }, 100);
window.addEventListener("load", function () {
  updateLanguage(Lang);
});
setInterval(updateloop, 5000);
updateloop();
