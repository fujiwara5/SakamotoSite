// firebase-config.js から設定情報をインポート
import { firebaseConfig } from './firebase-config.js';

// Firebase関連のモジュールをインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firestore & Auth 初期設定 ---
// `firebaseConfig`はインポートしたものを使用
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;
let isAuthReady = false;

// --- 認証処理 ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ユーザーがログイン済み
        currentUserId = user.uid;
        document.getElementById('userId').textContent = currentUserId;
        console.log("Authenticated with UID:", currentUserId);
        isAuthReady = true;
        loadImages(); // 認証後に画像読み込みを開始
    } else {
         // ユーザーが未ログイン
        try {
            // この部分は特殊な認証方法なので、今回はシンプルな匿名認証に絞ります
            // if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            //     await signInWithCustomToken(auth, __initial_auth_token);
            // } else {
            //     await signInAnonymously(auth);
            // }
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Authentication failed: ", error);
            document.getElementById('userId').textContent = '認証エラー';
        }
    }
});

// --- DOM要素の取得 ---
const form = document.getElementById('upload-form');
const submitButton = document.getElementById('submit-button');
const uploadIndicator = document.getElementById('upload-indicator');
const gallery = document.getElementById('gallery');
const loadingGallery = document.getElementById('loading-gallery');

// モーダル関連の要素
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalAuthor = document.getElementById('modal-author');
const modalClose = document.getElementById('modal-close');

// --- イベントリスナー ---

// フォーム送信処理
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady || !currentUserId) {
        alert("認証が完了していません。少し待ってから再度お試しください。");
        return;
    }

    // UIを更新してアップロード中であることを示す
    submitButton.disabled = true;
    submitButton.textContent = 'アップロード中...';
    uploadIndicator.classList.remove('hidden');

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const imageFile = document.getElementById('image-file').files[0];

    if (!imageFile) {
        alert('画像ファイルを選択してください。');
        resetSubmitButton();
        return;
    }
    
    // FileReaderを使用して画像をBase64にエンコード
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
        const imageData = reader.result;
        try {
            // Firestoreにデータを保存
            const docRef = await addDoc(collection(db,"images"), {
                title: title,
                description: description,
                imageData: imageData, // Base64文字列を保存
                authorId: currentUserId,
                createdAt: new Date()
            });
            console.log("Document written with ID: ", docRef.id);
            form.reset(); // フォームをリセット
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("アップロードに失敗しました。");
        } finally {
            resetSubmitButton();
        }
    };
    reader.onerror = (error) => {
        console.error("File reading error: ", error);
        alert("ファイルの読み込みに失敗しました。");
        resetSubmitButton();
    };
});

// モーダルを閉じる
modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
         modal.classList.add('hidden');
    }
});

// --- 関数 ---

// 送信ボタンの状態をリセットする関数
function resetSubmitButton() {
    submitButton.disabled = false;
    submitButton.textContent = '投稿する';
    uploadIndicator.classList.add('hidden');
}

// 画像を読み込んでギャラリーに表示する関数
function loadImages() {
    if (!isAuthReady) return;
    const imagesCollection = collection(db, "images");
    const q = query(imagesCollection); // createdAtでのソートはインデックスが必要なため、一旦削除

    onSnapshot(q, (snapshot) => {
        loadingGallery.classList.add('hidden');
        
        // Firestoreから取得したドキュメントを配列に変換し、クライアントサイドでソート
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

        // 新しい内容でギャラリーを更新
        gallery.innerHTML = docs.map(doc => createImageCard(doc, doc.id)).join('');

        // 画像カードにクリックイベントを追加
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const imageId = item.dataset.id;
                const imageData = docs.find(d => d.id === imageId);
                if(imageData) {
                    openModal(imageData);
                }
            });
        });

    }, (error) => {
        console.error("Error fetching images: ", error);
        loadingGallery.innerHTML = '<p class="text-red-400">画像の読み込み中にエラーが発生しました。</p>';
    });
}

// 画像カードのHTMLを生成する関数
function createImageCard(image, id) {
     // 説明文を短縮
    const shortDescription = image.description.length > 50 
        ? image.description.substring(0, 50) + '...' 
        : image.description;

    return `
        <div data-id="${id}" class="gallery-item masonry-item bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <img src="${image.imageData}" alt="${image.title}" class="w-full h-auto object-cover" loading="lazy">
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${image.title}</h3>
                <p class="text-gray-400 text-sm">${shortDescription}</p>
            </div>
        </div>
    `;
}

// モーダルを開いて画像詳細を表示する関数
function openModal(image) {
    modalImage.src = image.imageData;
    modalImage.alt = image.title;
    modalTitle.textContent = image.title;
    modalDescription.textContent = image.description;
    modalAuthor.textContent = image.authorId;
    modal.classList.remove('hidden');
}