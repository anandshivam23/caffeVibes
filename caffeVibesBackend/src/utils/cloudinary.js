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
        
        // Offline / Local Development Fallback if credentials are missing
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.log("Cloudinary credentials missing, falling back to local file serving.");
            const urlPath = localFilePath.replace(/\\/g, '/').replace(/^public\//, '').replace(/^\.\/public\//, '');
            const localUrl = `http://localhost:8000/${urlPath}`;
            console.log("Mock uploaded local URL:", localUrl);
            return {
                url: localUrl,
                secure_url: localUrl,
                public_id: "local-dev-placeholder"
            };
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Cloudinary upload failed, falling back to local file serving:", error);
        try {
            const urlPath = localFilePath.replace(/\\/g, '/').replace(/^public\//, '').replace(/^\.\/public\//, '');
            const localUrl = `http://localhost:8000/${urlPath}`;
            return {
                url: localUrl,
                secure_url: localUrl,
                public_id: "local-dev-placeholder"
            };
        } catch (innerErr) {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
            return null;
        }
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