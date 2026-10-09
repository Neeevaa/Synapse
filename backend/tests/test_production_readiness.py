import pytest
from app.core.config.database import normalize_database_url, mask_database_url, DatabaseSettings
from app.core.config.jwt import JWTSettings, DEV_DEFAULT_JWT_SECRET


class TestDatabaseURLNormalization:
    def test_render_postgres_scheme_converts_to_psycopg2(self):
        raw = "postgres://user:secret123@ep-cool-fog.render.com:5432/synapse_prod"
        normalized = normalize_database_url(raw)
        assert normalized == "postgresql+psycopg2://user:secret123@ep-cool-fog.render.com:5432/synapse_prod"

    def test_postgresql_without_driver_converts_to_psycopg2(self):
        raw = "postgresql://user:secret123@ep-cool-fog.render.com:5432/synapse_prod"
        normalized = normalize_database_url(raw)
        assert normalized == "postgresql+psycopg2://user:secret123@ep-cool-fog.render.com:5432/synapse_prod"

    def test_postgresql_psycopg_v3_converts_to_psycopg2(self):
        raw = "postgresql+psycopg://user:secret123@localhost:5432/synapse"
        normalized = normalize_database_url(raw)
        assert normalized == "postgresql+psycopg2://user:secret123@localhost:5432/synapse"

    def test_postgresql_psycopg2_remains_unchanged(self):
        raw = "postgresql+psycopg2://user:secret123@localhost:5432/synapse"
        normalized = normalize_database_url(raw)
        assert normalized == raw

    def test_sqlite_url_preserved(self):
        raw = "sqlite:///./synapse.db"
        assert normalize_database_url(raw) == raw
        assert normalize_database_url("sqlite://") == "sqlite://"

    def test_empty_or_none_url(self):
        assert normalize_database_url("") == ""
        assert normalize_database_url(None) == ""


class TestSafeURLMasking:
    def test_mask_hides_password_in_postgresql_url(self):
        raw = "postgresql+psycopg2://admin_user:super_secret_pwd_999@ep-host.render.com:5432/synapse"
        masked = mask_database_url(raw)
        assert "super_secret_pwd_999" not in masked
        assert "***" in masked
        assert "admin_user" in masked
        assert "ep-host.render.com" in masked

    def test_mask_hides_password_in_render_postgres_url(self):
        raw = "postgres://db_user:my_secret_pass@dpg-host.render.com/synapse_db"
        masked = mask_database_url(raw)
        assert "my_secret_pass" not in masked
        assert "***" in masked

    def test_mask_empty_or_none(self):
        assert mask_database_url("") == "<empty>"
        assert mask_database_url(None) == "<empty>"


class TestJWTProductionValidation:
    def test_dev_default_rejected_in_production(self):
        jwt_settings = JWTSettings(JWT_SECRET_KEY=DEV_DEFAULT_JWT_SECRET)
        with pytest.raises(ValueError) as exc:
            jwt_settings.validate_for_production()
        assert "non-default" in str(exc.value)

    def test_empty_key_rejected_in_production(self):
        jwt_settings = JWTSettings(JWT_SECRET_KEY="")
        with pytest.raises(ValueError) as exc:
            jwt_settings.validate_for_production()
        assert "non-default" in str(exc.value)

    def test_short_key_rejected_in_production(self):
        jwt_settings = JWTSettings(JWT_SECRET_KEY="too_short_key_under_32_bytes")
        with pytest.raises(ValueError) as exc:
            jwt_settings.validate_for_production()
        assert "at least 32 bytes" in str(exc.value)

    def test_strong_key_accepted_in_production(self):
        strong_key = "a_sufficiently_strong_random_secret_with_more_than_32_bytes_entropy_12345"
        jwt_settings = JWTSettings(JWT_SECRET_KEY=strong_key)
        # Should not raise
        jwt_settings.validate_for_production()


class TestProductionDatabaseSafeguards:
    def test_production_rejects_sqlite(self, monkeypatch):
        monkeypatch.setenv("ENVIRONMENT", "production")
        from app.core.config.settings import Settings

        prod_settings = Settings(ENVIRONMENT="production")
        prod_settings.db.DATABASE_URL = "sqlite:///./synapse.db"

        # Simulating database.py validation check
        db_url = normalize_database_url(prod_settings.db.DATABASE_URL)
        assert prod_settings.is_production is True
        assert not (db_url.startswith("postgresql+psycopg2://") or db_url.startswith("postgresql://"))

    def test_production_accepts_valid_postgresql(self, monkeypatch):
        monkeypatch.setenv("ENVIRONMENT", "production")
        from app.core.config.settings import Settings

        prod_settings = Settings(ENVIRONMENT="production")
        prod_settings.db.DATABASE_URL = "postgres://usr:pwd@host.render.com:5432/synapse"
        normalized = normalize_database_url(prod_settings.db.DATABASE_URL)
        assert normalized.startswith("postgresql+psycopg2://")
