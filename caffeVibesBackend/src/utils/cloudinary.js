import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) 
        return null;
    }
}

const deleteOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new ApiError(404, "Image Invalid")
        }
        const publicId = extractPublicId(localFilePath);

        const response = await cloudinary.uploader.destroy(publicId);
        if(response.result != 'ok'){
            throw new ApiError(404, "Deletion Failed from Cloudinary")
        }
        
        return 1;
    } catch (error) {
        return null;
    }
}

export {uploadOnCloudinary , deleteOnCloudinary}