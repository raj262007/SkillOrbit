from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.database import supabase
from app.utils.cloudinary import upload_file_to_cloudinary

router = APIRouter()


@router.post("/admission", status_code=status.HTTP_201_CREATED)
async def submit_admission(
    full_name: str = Form(...),
    email: str = Form(...),
    whatsapp: str = Form(...),
    enrollment_no: str = Form(...),
    branch: str = Form(...),
    year: str = Form(...),
    address: str = Form(...),
    parent_mobile: str = Form(...),
    domain: str = Form(...),
    reason: str = Form(...),
    photo: UploadFile = File(...),
    id_card: UploadFile = File(...),
):
    """
    Accept admission form submission with files, upload to Cloudinary,
    and save the record to the Supabase admissions table.
    """
    try:
        # Read file bytes
        photo_bytes = await photo.read()
        id_card_bytes = await id_card.read()

        # Upload both photo and ID card concurrently in background threads
        import asyncio
        photo_url, id_card_url = await asyncio.gather(
            asyncio.to_thread(
                upload_file_to_cloudinary,
                photo_bytes,
                photo.filename or "photo.jpg",
                "skillorbit/photos"
            ),
            asyncio.to_thread(
                upload_file_to_cloudinary,
                id_card_bytes,
                id_card.filename or "id_card.jpg",
                "skillorbit/id-cards"
            ),
        )

        if not photo_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload student photo.",
            )
        if not id_card_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload ID card.",
            )

        # --- Insert record into Supabase ---
        record = {
            "full_name": full_name,
            "email": email,
            "whatsapp": whatsapp,
            "enrollment_no": enrollment_no,
            "branch": branch,
            "year": year,
            "address": address,
            "parent_mobile": parent_mobile,
            "domain": domain,
            "reason": reason,
            "photo_url": photo_url,
            "id_card_url": id_card_url,
            "status": "pending",
        }

        response = supabase.table("admissions").insert(record).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save admission record.",
            )

        return {"message": "Application submitted successfully. We'll review it within 2-3 days."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )
