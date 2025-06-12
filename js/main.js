// js/main.js

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Supabaseクライアントの初期化
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM要素の取得 (変更なし) ---
const userIdSpan = document.getElementById('userId');
const header = document.querySelector('header');
const form = document.getElementById('upload-form');
const uploadSection = document.querySelector('.mb-12.max-w-2xl');
const submitButton = document.getElementById('submit-button');
const uploadIndicator = document.getElementById('upload-indicator');
const gallery = document.getElementById('gallery');
const loadingGallery = document.getElementById('loading-gallery');
// (モーダル関連の要素も同様に取得)
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalAuthor = document.getElementById('modal-author');
const modalClose = document.getElementById('modal-close');

let currentUser = null;

// --- 認証処理 ---
// ログイン状態の変化を監視
supabase.auth.onAuthStateChange((event, session) => {
    // ログインしていたら session にユーザー情報が入る
    currentUser = session?.user ?? null;
    updateUI();
});

// UIを更新する関数
function updateUI() {
    // 既存のログイン/ログアウトボタンがあれば削除
    document.getElementById('login-button')?.remove();
    document.getElementById('logout-button')?.remove();

    if (currentUser) {
        // ログインしている場合
        userIdSpan.textContent = currentUser.id;
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.textContent = 'ログアウト';
        logoutButton.className = 'ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs';
        logoutButton.onclick = async () => await supabase.auth.signOut();
        header.querySelector('.text-xs').appendChild(logoutButton);
        uploadSection.style.display = 'block';
    } else {
        // ログアウトしている場合
        userIdSpan.textContent = '未ログイン';
        const loginButton = document.createElement('button');
        loginButton.id = 'login-button';
        loginButton.textContent = 'Googleでログイン';
        loginButton.className = 'ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded';
        loginButton.onclick = () => supabase.auth.signInWithOAuth({ provider: 'google' });
        header.appendChild(loginButton);
        uploadSection.style.display = 'none';
    }
}

// --- 画像のアップロード処理 ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert("ログインしてください。");
        return;
    }
    
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const imageFile = document.getElementById('image-file').files[0];

    if (!imageFile) {
        alert('画像ファイルを選択してください。');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'アップロード中...';
    uploadIndicator.classList.remove('hidden');

    try {
        // 1. Supabase Storageに画像をアップロード
        const filePath = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;

        // 2. アップロードした画像の公開URLを取得
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        const imageUrl = urlData.publicUrl;

        // 3. Supabase Databaseに画像情報を保存
        const { error: insertError } = await supabase.from('images').insert({
            title: title,
            description: description,
            image_url: imageUrl,
            user_id: currentUser.id,
            user_name: currentUser.user_metadata?.full_name || currentUser.email // Google名またはEmail
        });
        if (insertError) throw insertError;
        
        form.reset();
        alert("投稿が完了しました！");
        loadImages(); // ギャラリーを再読み込み

    } catch (error) {
        console.error("投稿エラー:", error.message);
        alert("投稿に失敗しました。");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '投稿する';
        uploadIndicator.classList.add('hidden');
    }
});


// --- 画像一覧の表示処理 ---
async function loadImages() {
    loadingGallery.style.display = 'block';
    gallery.innerHTML = '';

    // Supabaseのimagesテーブルから全データを取得
    const { data: images, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false }); // 新しい順に並び替え

    if (error) {
        console.error("読み込みエラー:", error);
        loadingGallery.innerHTML = '<p class="text-red-400">画像の読み込み中にエラーが発生しました。</p>';
        return;
    }

    loadingGallery.style.display = 'none';

    // 取得したデータでギャラリーを生成
    images.forEach(image => {
        const item = createImageCard(image, image.id);
        gallery.innerHTML += item;
    });

    // 各画像にクリックイベントを追加
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const imageId = parseInt(item.dataset.id, 10); // idは数値
            const imageData = images.find(d => d.id === imageId);
            if(imageData) {
                openModal(imageData);
            }
        });
    });
}

// 画像カードのHTMLを生成する関数 (image.imageUrl を使用)
function createImageCard(image, id) {
    const shortDescription = image.description.length > 50 ? image.description.substring(0, 50) + '...' : image.description;
    return `
        <div data-id="${id}" class="gallery-item masonry-item ...">
            <img src="${image.image_url}" alt="${image.title}" ...>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${image.title}</h3>
                <p class="text-gray-400 text-sm">${shortDescription}</p>
            </div>
        </div>
    `;
}

// モーダルを開く関数 (image.imageUrl, image.user_name などを使用)
function openModal(image) {
    modalImage.src = image.image_url;
    modalTitle.textContent = image.title;
    modalDescription.textContent = image.description;
    modalAuthor.textContent = `${image.user_name} (${image.user_id})`;
    modal.classList.remove('hidden');
}

// モーダルを閉じるイベントリスナー (変更なし)
modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
         modal.classList.add('hidden');
    }
});

// 初期読み込み
loadImages();