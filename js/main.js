// js/main.js (修正済み)

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// 【修正点】変数名を `supabaseClient` に変更し、正しくクライアントを作成します。
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM要素の取得 (変更なし) ---
const userIdSpan = document.getElementById('userId');
const header = document.querySelector('header');
const form = document.getElementById('upload-form');
const uploadSection = document.querySelector('.mb-12.max-w-2xl');
const submitButton = document.getElementById('submit-button');
const uploadIndicator = document.getElementById('upload-indicator');
const gallery = document.getElementById('gallery');
const loadingGallery = document.getElementById('loading-gallery');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalAuthor = document.getElementById('modal-author');
const modalClose = document.getElementById('modal-close');

let currentUser = null;

// --- 認証処理 ---
// 【修正点】`supabase` を `supabaseClient` に変更
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateUI();
});

// UIを更新する関数
function updateUI() {
    document.getElementById('login-button')?.remove();
    document.getElementById('logout-button')?.remove();

    if (currentUser) {
        userIdSpan.textContent = currentUser.id;
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.textContent = 'ログアウト';
        logoutButton.className = 'ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs';
        // 【修正点】`supabase` を `supabaseClient` に変更
        logoutButton.onclick = async () => await supabaseClient.auth.signOut();
        header.querySelector('.text-xs').appendChild(logoutButton);
        uploadSection.style.display = 'block';
    } else {
        userIdSpan.textContent = '未ログイン';
        const loginButton = document.createElement('button');
        loginButton.id = 'login-button';
        loginButton.textContent = 'Googleでログイン';
        loginButton.className = 'ml-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded';
        // 【修正点】`supabase` を `supabaseClient` に変更
        // 修正後のコード
        loginButton.onclick = () => {
        supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
            redirectTo: 'https://fujiwara5.github.io/SakamotoSite/'
            }
        });
        };
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
        const filePath = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
        // 【修正点】`supabase` を `supabaseClient` に変更
        const { error: uploadError } = await supabaseClient.storage.from('images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;

        // 【修正点】`supabase` を `supabaseClient` に変更
        const { data: urlData } = supabaseClient.storage.from('images').getPublicUrl(filePath);
        const imageUrl = urlData.publicUrl;

        // 【修正点】`supabase` を `supabaseClient` に変更
        const { error: insertError } = await supabaseClient.from('images').insert({
            title: title,
            description: description,
            image_url: imageUrl,
            user_id: currentUser.id,
            user_name: currentUser.user_metadata?.full_name || currentUser.email
        });
        if (insertError) throw insertError;
        
        form.reset();
        alert("投稿が完了しました！");
        loadImages();

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

    // 【修正点】`supabase` を `supabaseClient` に変更
    const { data: images, error } = await supabaseClient
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("読み込みエラー:", error);
        loadingGallery.innerHTML = '<p class="text-red-400">画像の読み込み中にエラーが発生しました。</p>';
        return;
    }

    loadingGallery.style.display = 'none';

    images.forEach(image => {
        const item = createImageCard(image, image.id);
        gallery.innerHTML += item;
    });

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const imageId = parseInt(item.dataset.id, 10);
            const imageData = images.find(d => d.id === imageId);
            if(imageData) {
                openModal(imageData);
            }
        });
    });
}



// (createImageCard, openModal, イベントリスナーは変更なし)
function createImageCard(image, id) {
    const shortDescription = image.description ? (image.description.length > 50 ? image.description.substring(0, 50) + '...' : image.description) : '';
    return `
        <div data-id="${id}" class="gallery-item masonry-item bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <img src="${image.image_url}" alt="${image.title}" class="w-full h-auto object-cover" loading="lazy">
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${image.title}</h3>
                <p class="text-gray-400 text-sm">${shortDescription}</p>
            </div>
        </div>
    `;
}

function openModal(image) {
    modalImage.src = image.image_url;
    modalTitle.textContent = image.title;
    modalDescription.textContent = image.description;
    modalAuthor.textContent = `${image.user_name} (${image.user_id})`;
    modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
         modal.classList.add('hidden');
    }
});

// 初期読み込み
loadImages();