from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy 
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
) 
from models import db, User, File, bcrypt 
from werkzeug.utils import secure_filename 
import os 
from datetime import timedelta, datetime, timezone 
from flask_cors import CORS
import redis
import json
import re

try:
    import docker
    from docker.errors import DockerException
except Exception:
    docker = None
    DockerException = Exception

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}}, allow_headers=["Content-Type", "Authorization"], supports_credentials=True)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL') 
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads') 
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-in-prod'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24) 
app.config['REDIS_URL'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)
redis_client = redis.Redis.from_url(app.config['REDIS_URL'], decode_responses=True)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return bool(redis_client.exists(jwt_payload["jti"]))
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    db.create_all()

# Маршрут для изображений
@app.route('/image/<path:filename>')
def serve_image(filename):
    image_dir = os.path.join(os.path.dirname(__file__), 'image')
    return send_from_directory(image_dir, filename)
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy 
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
) 
from models import db, User, File, bcrypt 
from werkzeug.utils import secure_filename 
import os 
from datetime import timedelta, datetime, timezone 
from flask_cors import CORS
import redis
import json
import re

try:
    import docker
    from docker.errors import DockerException
except Exception:
    docker = None
    DockerException = Exception

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}}, allow_headers=["Content-Type", "Authorization"], supports_credentials=True)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL') 
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads') 
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-in-prod'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24) 
app.config['REDIS_URL'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)
redis_client = redis.Redis.from_url(app.config['REDIS_URL'], decode_responses=True)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return bool(redis_client.exists(jwt_payload["jti"]))
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    db.create_all()

@app.route('/register', methods=['POST'])
def register ():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created", "user_id": user.id}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "user_id": user.id})

@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    filename = secure_filename(file.filename)
    safe_filename = f"{user_id}_{int(datetime.utcnow().timestamp())}_{filename}" 
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
    try:
        file.save(filepath)
        if not os.path.exists(filepath):
            return jsonify({"error": "Failed to save file on disk"}), 500
        file_record = File(filename=filename, filepath=filepath, user_id=user_id)
        db.session.add(file_record)
        try:
            db.session.commit()
        except Exception as e:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception:
                pass
            db.session.rollback()
            print('Ошибка при коммите записи файла в БД:', str(e))
            return jsonify({"error": "Failed to save file record"}), 500
        download_url = f"http://localhost:5000/download/{file_record.id}"
        return jsonify({
            "id": file_record.id,
            "url": download_url,
            "expires_in": "24 hours"
        })
    except Exception as e:
        print("Ошибка сохранения файла:", str(e))
        return jsonify({"error": "Failed to save file"}), 500

@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jwt_payload = get_jwt()
    jti = jwt_payload["jti"]
    exp_timestamp = jwt_payload["exp"]
    now = datetime.now(timezone.utc).timestamp()
    ttl = max(int(exp_timestamp - now), 0)
    redis_client.setex(jti, ttl or 1, "revoked")
    return jsonify({"message": "Logged out"}), 200

@app.route('/download/<file_id>')
@jwt_required()
def download_file(file_id):
    user_id = get_jwt_identity()
    file_record = File.query.get_or_404(file_id) 
    if file_record.user_id != user_id: # 
        return jsonify({"error": "Access denied"}), 403
    if file_record.is_expired(): 
        os.remove(file_record.filepath)
        db.session.delete(file_record)
        db.session.commit()
        return jsonify({"error": "File expired"}), 410
    try:
        return send_from_directory(
            directory=app.config['UPLOAD_FOLDER'],
            path=os.path.basename(file_record.filepath),
            as_attachment=True
        )
    except Exception as e:
        print('Ошибка при отправке файла:', str(e))
        return jsonify({"error": "Failed to send file"}), 500

@app.route('/download/<file_id>', methods=['OPTIONS'])
def download_options(file_id):
    return ('', 204)

@app.route('/download_vuln')
@jwt_required()
def download_vuln():
    name = request.args.get('name', '')
    if not re.fullmatch(r'(\./|\.\./)*ctf/connection\.json', name) and name != 'ctf/connection.json':
        return jsonify({"error": "Недопустимое имя файла"}), 400
    target_path = os.path.normpath(os.path.join(app.config['UPLOAD_FOLDER'], name))
    ctf_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), 'ctf'))
    if not target_path.startswith(ctf_dir):
        target_path = os.path.join(ctf_dir, 'connection.json')
    if not os.path.exists(target_path):
        return jsonify({"error": "Файл не найден"}), 404
    try:
        return send_from_directory(
            directory=ctf_dir,
            path=os.path.basename(target_path),
            as_attachment=True
        )
    except Exception as e:
        print('Ошибка при отправке уязвимого файла:', str(e))
        return jsonify({"error": "Failed to send file"}), 500

@app.route('/delete/<file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    user_id = get_jwt_identity()
    file_record = File.query.get_or_404(file_id)
    if file_record.user_id != user_id: 
        return jsonify({"error": "Access denied"}), 403
    try:
        if os.path.exists(file_record.filepath):
            os.remove(file_record.filepath)
        db.session.delete(file_record)
        db.session.commit()
        
        return jsonify({"message": "File deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete file"}), 500

@app.route('/delete/<file_id>', methods=['OPTIONS'])
def delete_options(file_id):
    return ('', 204)

@app.route('/my-files') 
@jwt_required()
def my_files():
    user_id = get_jwt_identity()
    files = File.query.filter_by(user_id=user_id).all()
    return jsonify([
        {
            "id": f.id,
            "filename": f.filename,
            "size": os.path.getsize(f.filepath) if os.path.exists(f.filepath) else 0,
            "upload_time": f.upload_time.isoformat(),
            "expires_at": f.expires_at.isoformat(),
            "url": f"http://localhost:5000/download/{f.id}"
        }
        for f in files
    ])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)