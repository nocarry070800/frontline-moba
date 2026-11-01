# Самостоятельное обновление игры

Рабочая папка: `C:\Users\Yernar\Desktop\FrontlineWASD`.
Репозиторий: https://github.com/nocarry070800/frontline-moba
Игра: http://169.58.99.208

## После разовой настройки

1. Измени файлы игры или баланса в папке на рабочем столе.
2. Запусти двойным щелчком `PUBLISH-UPDATE.cmd`.
3. Введи короткое описание изменений и нажми Enter. При пустом описании подставятся дата и время.
4. Дождись успешной отправки. Прогресс публикации: https://github.com/nocarry070800/frontline-moba/actions
5. Когда проверка и публикация станут зелёными, обнови страницу игры через Ctrl+F5.

Файл сохраняет все изменения Git-коммитом и отправляет ветку `main` в GitHub. Если Git попросит войти в GitHub, выполни вход в открывшемся окне. Если отправка отклонена, скрипт сообщает ошибку и не перезаписывает историю.

GitHub проверяет синтаксис и выдачу файлов игры, затем обновляет VPS. До активации новой версии текущая продолжает работать. При обновлении процесс игры перезапускается, текущие матчи завершаются. Если новая версия не проходит запуск, установщик возвращает предыдущую.

Дополнительные библиотеки через npm не устанавливаются: игра использует встроенные модули Node.js 24.

## Разовая настройка VPS

В **Windows PowerShell** отправь подготовленный архив настройки:

```powershell
scp "C:\Users\Yernar\Documents\ChatGPT\Military MOBA\git-deploy\frontline-git-setup.tar.gz" root@169.58.99.208:/root/
```

Затем подключись:

```powershell
ssh root@169.58.99.208
```

Когда появится приглашение **`root@vmi3714272:~#`**, введи уже на **Ubuntu VPS**:

```bash
mkdir -p /root/frontline-git-setup
tar -xzf /root/frontline-git-setup.tar.gz -C /root/frontline-git-setup
bash /root/frontline-git-setup/tools/deploy/setup-vps.sh
```

Настройка не перезапускает текущую игру. Она создаёт ключ только для публикации игры; этот ключ не открывает обычную командную строку SSH.

## Два секрета в GitHub

Открой:
https://github.com/nocarry070800/frontline-moba/settings/secrets/actions

Нажми **New repository secret** и добавь:

1. **`CONTABO_SSH_KEY`** — полный текст приватного ключа. На VPS выведи его командой ниже и скопируй непосредственно в поле Secret в GitHub, включая строки BEGIN/END. Не отправляй этот текст в чат и не сохраняй в папке игры.

```bash
cat /root/.ssh/frontline_actions
```

2. **`CONTABO_KNOWN_HOSTS`** — публичная строка, которую вывел установщик после `use the following PUBLIC line`. Чтобы вывести её снова:

```bash
printf '169.58.99.208 '; cut -d ' ' -f 1,2 /etc/ssh/ssh_host_ed25519_key.pub
```

После добавления обоих секретов запусти `PUBLISH-UPDATE.cmd` на своём компьютере. Первый push добавит GitHub Actions и запустит первую автоматическую публикацию.

## Проверка и повторный запуск

- История публикаций: https://github.com/nocarry070800/frontline-moba/actions
- Для повторной публикации без изменений: выбери **Deploy game to Contabo → Run workflow → main**.
- Если проверка красная, открой её и посмотри шаг, на котором появилась ошибка. При ошибке до публикации текущий сервер не меняется.
- На VPS: `systemctl status frontline --no-pager` — состояние сервиса.
- На VPS: `journalctl -u frontline -n 50 --no-pager` — последние сообщения.
- Активная версия: `cat /opt/frontline-current/.release.json` — после первой автоматической публикации.

Сохранённые версии находятся в `/opt/frontline-releases`. Исходная ручная установка остаётся в `/opt/frontline`.


Если изменений в файлах нет, `PUBLISH-UPDATE.cmd` создаёт пустой служебный коммит `Redeploy current version ...` и отправляет его в GitHub. Это снова запускает публикацию текущей версии на Contabo. Дополнительный вход через GitHub CLI не требуется.
