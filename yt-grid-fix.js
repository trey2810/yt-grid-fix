// ==UserScript==
// @name         YouTube Grid Fix
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Убирает огромные видосы в 3 колонки, ставит своё число и чинит скачки скролла
// @author       trey2810 and deepseek
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ─── Настройки ─────────────────────────────────────────────
    const COLUMNS = 6;          // сколько колонок хотите видеть
    const SCROLL_THRESHOLD = 20; // чувствительность к скачку (пикселей)
    // ──────────────────────────────────────────────────────────

    // 1. Внедряем CSS, переопределяющий сетку
    const style = document.createElement('style');
    style.textContent = `
        ytd-rich-grid-renderer {
            --ytd-rich-grid-items-per-row: ${COLUMNS} !important;
        }
    `;
    document.head.appendChild(style);

    // 2. Фикс скачка скролла
    let observer = null;
    let savedScrollY = window.scrollY;

    function setupFix() {
        // Удаляем старый наблюдатель, если есть
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        const container = document.querySelector('#contents');
        if (!container) {
            // Если контейнер ещё не загрузился, пробуем снова через 500 мс
            setTimeout(setupFix, 500);
            return;
        }

        // Наблюдаем за добавлением новых видео в #contents
        observer = new MutationObserver(() => {
            const currentY = window.scrollY;
            // Если прокрутка резко ушла вверх (подгрузка сместила контент) — возвращаем
            if (currentY < savedScrollY - SCROLL_THRESHOLD) {
                window.scrollTo({ top: savedScrollY, behavior: 'auto' });
            } else {
                // Иначе просто обновляем сохранённую позицию, если пользователь скроллит вниз
                if (currentY > savedScrollY) {
                    savedScrollY = currentY;
                }
            }
        });

        observer.observe(container, { childList: true, subtree: true });

        // Обновляем сохранённую позицию при любом скролле (пользовательском)
        window.addEventListener('scroll', () => {
            savedScrollY = window.scrollY;
        }, { passive: true });

        // И при изменении размера окна (на всякий случай)
        window.addEventListener('resize', () => {
            savedScrollY = window.scrollY;
        }, { passive: true });
    }

    // Запускаем после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupFix);
    } else {
        setupFix();
    }

    // 3. Переподключаем фикс при переходе между страницами (SPA)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setupFix(); // заново подцепим контейнер
        }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });
})();
