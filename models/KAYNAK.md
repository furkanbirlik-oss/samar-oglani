# Model ve kütüphane kaynakları

- `face_paint_512_v2_0.onnx`: AnimeGANv2 yüz modeli (ONNX). Kaynak: https://huggingface.co/akhaliq/AnimeGANv2-ONNX
  PyTorch sürümü: https://github.com/bryandlee/animegan2-pytorch
  Özgün proje: AnimeGANv2 (TachibanaYoshino). Özgün projenin ağırlıkları ticari olmayan
  kullanım şartı taşıyabilir; oyunu ticari amaçla kullanmadan önce lisansı kontrol et.
- `lib/ort/`: onnxruntime-web 1.31.1 (Microsoft, MIT lisansı). Kaynak: https://www.npmjs.com/package/onnxruntime-web
- `pose_landmarker_full.task`: MediaPipe Pose Landmarker (Google, Apache 2.0). Tam boy fotoğrafta eklemleri bulur ve kişiyi arka plandan ayırır.
  Kaynak: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task
- `lib/mediapipe/`: @mediapipe/tasks-vision 1.2.3 (Google, Apache 2.0). Kaynak: https://www.npmjs.com/package/@mediapipe/tasks-vision
