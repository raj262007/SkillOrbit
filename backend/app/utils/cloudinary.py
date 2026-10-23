import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)

def upload_file_to_cloudinary(file_bytes: bytes, filename: str, folder: str = "skillorbit") -> str:
    """
    Upload a file to Cloudinary and return its secure URL.
    Supports images and PDFs.
    """
    # Determine resource type based on extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    resource_type = "raw" if ext == "pdf" else "image"

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type=resource_type,
        use_filename=True,
        unique_filename=True,
        timeout=60,
    )
    return result.get("secure_url", "")
