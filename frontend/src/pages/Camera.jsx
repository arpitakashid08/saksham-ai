import { useState } from "react";
import axios from "axios";

function Camera() {

  const [image, setImage] = useState(null);

  const uploadImage = async () => {

    const formData = new FormData();

    formData.append("image", image);

    const response = await axios.post(
      "http://127.0.0.1:5001/upload",
      formData
    );

    alert(response.data.message);
  };

  return (

    <div>

      <h1>Camera Assistant</h1>

      <input
        type="file"
        onChange={(e) =>
          setImage(e.target.files[0])
        }
      />

      <br /><br />

      <button onClick={uploadImage}>
        Analyze
      </button>

    </div>

  );
}

export default Camera;