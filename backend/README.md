# Authentication API

A FastAPI-based authentication system with JWT token support.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
uvicorn app.main:app --host 0.0.0.0 --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

- `POST /register`: Register a new user
  - Required fields: username, email, password
  - Returns user information

- `POST /token`: Login to get access token
  - Required fields: username, password
  - Returns JWT access token

## Project Structure

```
app/
├── __init__.py        # FastAPI app initialization
├── main.py           # Application entry point
├── config.py         # Configuration settings
├── models/          # Pydantic models
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utility functions
```

## Development

- API documentation is available at `/docs` or `/redoc`
- Update `config.py` for environment-specific settings
- Database is SQLite by default, configured in `config.py`

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- CORS protection enabled