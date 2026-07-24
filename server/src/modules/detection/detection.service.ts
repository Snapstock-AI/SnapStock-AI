import axios from "axios";
import FormData from "form-data";

export class DetectionService {

  static async analyze(file?: Express.Multer.File) {

    if (!file) {
      throw new Error("No image uploaded.");
    }


    const formData = new FormData();

    formData.append(
      "file",
      file.buffer,
      {
        filename: file.originalname,
        contentType: file.mimetype,
      }
    );


    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/analyze`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );


    return response.data;
  }

}