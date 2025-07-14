try:
    from importlib import metadata
    __version__ = metadata.version("label-studio-sdk")
except:
    # Fallback for local development
    __version__ = "1.0.18"
