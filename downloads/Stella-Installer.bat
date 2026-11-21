@echo off
chcp 65001 >nul
title Стелла AI — Установщик для браузеров
echo.
echo  =============================================
echo      СТЕЛЛА AI — УСТАНОВЩИК ДЛЯ БРАУЗЕРОВ
echo  =============================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\Stella-AI"
set "ZIP_LOCAL=%~dp0stella-extension.zip"
set "ZIP_URL=https://a1x10.github.io/stella-ai/downloads/stella-extension.zip"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if exist "%ZIP_LOCAL%" (
  echo [1/3] Распаковываю локальный архив Стеллы...
  powershell -NoProfile -Command "Expand-Archive -Path '%ZIP_LOCAL%' -DestinationPath '%INSTALL_DIR%' -Force"
) else (
  echo [1/3] Скачиваю последнюю версию Стеллы...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile '%TEMP%\stella-extension.zip'; Expand-Archive -Path '%TEMP%\stella-extension.zip' -DestinationPath '%INSTALL_DIR%' -Force"
)

if errorlevel 1 (
  echo.
  echo [!] Не удалось распаковать архив. Положите stella-extension.zip рядом с установщиком.
  pause
  exit /b 1
)

echo [2/3] Копирую путь установки в буфер обмена...
powershell -NoProfile -Command "Set-Clipboard -Value '%INSTALL_DIR%'"

echo [3/3] Ищу установленные браузеры...
echo.
set "FOUND=0"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  echo  - Найден Google Chrome
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
  set "FOUND=1"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  echo  - Найден Google Chrome
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
  set "FOUND=1"
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  echo  - Найден Microsoft Edge
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "edge://extensions"
  set "FOUND=1"
)

if exist "%LOCALAPPDATA%\Yandex\YandexBrowser\Application\browser.exe" (
  echo  - Найден Яндекс.Браузер
  start "" "%LOCALAPPDATA%\Yandex\YandexBrowser\Application\browser.exe" "browser://tune"
  set "FOUND=1"
)

if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  echo  - Найден Brave
  start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" "brave://extensions"
  set "FOUND=1"
)

if exist "%LOCALAPPDATA%\Programs\Opera\opera.exe" (
  echo  - Найден Opera
  start "" "%LOCALAPPDATA%\Programs\Opera\opera.exe" "opera://extensions"
  set "FOUND=1"
)

start "" explorer.exe /select,"%INSTALL_DIR%"

echo.
echo  =============================================
echo   Готово! Папка установлена в:
echo   %INSTALL_DIR%
echo.
echo   В открывшемся браузере включите "Режим разработчика"
echo   и перетащите папку Stella-AI мышкой (или нажмите
echo   "Загрузить распакованное" -^> Ctrl+V -^> Enter).
echo  =============================================
echo.
pause
