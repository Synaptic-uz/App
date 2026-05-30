from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 3007
    mongodb_uri: str = "mongodb://localhost:27017/synaptic-ai"

    jwt_secret: str = "change-me-to-a-long-random-secret"
    jwt_access_expires: str = "1h"
    jwt_refresh_expires: str = "7d"
    initial_wallet_balance: int = 0
    allow_mock_deposit: bool = False
    agent_revenue_share: float = 0.7
    public_url: str = ""

    github_token: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_timeout_ms: int = 25000

    vector_db_enabled: bool = True
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "synaptic_campaigns"
    vector_search_top_k: int = 20
    vector_score_threshold: float = 0.15

    ad_weight_bid: float = 0.4
    ad_weight_relevance: float = 0.3
    ad_weight_ctr: float = 0.2
    ad_weight_random: float = 0.1
    ad_top_k: int = 5
    ad_recent_window: int = 8
    ad_max_same_in_window: int = 2
    ad_max_owner_in_window: int = 4

    @field_validator("allow_mock_deposit", mode="before")
    @classmethod
    def _parse_mock_deposit(cls, v):
        if isinstance(v, bool):
            return v
        return str(v).strip() in ("1", "true", "True", "yes")

    @field_validator("vector_db_enabled", mode="before")
    @classmethod
    def _parse_vector_db(cls, v):
        if isinstance(v, bool):
            return v
        return str(v).strip() not in ("0", "false", "False", "no", "off")


settings = Settings()
