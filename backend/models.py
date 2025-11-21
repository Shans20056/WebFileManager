from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import uuid


db = SQLAlchemy()
bcrypt = Bcrypt()

# Класс, представляющий таблицу пользователей в базе данных.
class User(db.Model):
    # id: Уникальный идентификатор пользователя (строка длиной 36 символов, соответствующая UUID). Генерируется автоматически с помощью uuid.uuid4(). Это первичный ключ (primary_key=True).
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # username: Имя пользователя (строка до 80 символов), уникальное (unique=True) и обязательное (nullable=False).
    username = db.Column(db.String(80), unique=True, nullable=False)
    # password_hash: Хеш пароля (строка до 128 символов), обязательное поле. Хранит хешированный пароль, а не сам пароль в открытом виде.
    password_hash = db.Column(db.String(128), nullable=False)
    # created_at: Дата и время создания пользователя (тип DateTime), по умолчанию текущая дата и время в UTC (datetime.utcnow).
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # set_password: Метод для хеширования пароля и сохранения его в поле password_hash. Принимает пароль в открытом виде, хеширует его с помощью
    def set_password(self,password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    # check_password: Метод для проверки пароля. Возвращает True, если пароль совпадает, и False в противном случае.
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

# Модель файл. Класс, представляющий таблицу файлов в базе данных. Также наследуется от db.Model.
class File(db.Model):
    # id: Уникальный идентификатор файла (строка UUID), первичный ключ, генерируется автоматически.
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # filename: Имя файла (строка до 255 символов), обязательное поле.
    filename = db.Column(db.String(255), nullable=False)
    # filepath: Путь к файлу в системе (строка до 255 символов), обязательное поле.
    filepath = db.Column(db.String(255), nullable=False)
    # upload_time: Дата и время загрузки файла, по умолчанию текущая дата и время в UTC.
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)
    # expires_at: Дата и время истечения срока действия файла, по умолчанию текущая дата плюс 24 часа (timedelta(hours=24)).
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24))
    # user_id: Внешний ключ, связывающий файл с пользователем (ссылается на поле id таблицы User). Обязательное поле.
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)

    def is_expired(self):
        if not self.expires_at:
            return False
        return datetime.utcnow() >= self.expires_at