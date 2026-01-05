// Business creation logic

let currentUser = null;
let selectedFiles = [];

// Protect page - business accounts only
document.addEventListener('DOMContentLoaded', async function () {
    const checkSupabase = setInterval(async () => {
        if (typeof supabase !== 'undefined') {
            clearInterval(checkSupabase);
            initPage();
        }
    }, 100);
});

async function initPage() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;

    // Fetch user data directly
    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (!userData || userData.account_type !== 'business') {
        alert('Only business accounts can create listings');
        window.location.href = 'dashboard.html';
        return;
    }

    loadCategories();

    // Ensure loader is hidden
    if (window.hideLoader) {
        window.hideLoader();
    }
}

// Load categories
async function loadCategories() {
    console.log("Starting loadCategories...");
    const categorySelect = document.getElementById('category');

    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('order', { ascending: true });

        if (error) {
            console.error('Supabase Error loading categories:', error);
            throw error;
        }

        console.log("Categories loaded from DB:", categories);

        if (!categories || categories.length === 0) {
            console.warn('No categories found in DB.');
            // Fallback manual categories if DB is empty for some reason
            const fallbackCats = [
                { id: '1', name: 'Restaurants', icon: '🍽️' },
                { id: '2', name: 'Groceries', icon: '🛒' },
                { id: '3', name: 'Healthcare', icon: '🏥' },
                { id: '4', name: 'Education', icon: '📚' },
                { id: '5', name: 'Other', icon: '✨' }
            ];
            populateCategories(categorySelect, fallbackCats);
            return;
        }

        populateCategories(categorySelect, categories);

    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback on error to keep UI functional
        const fallbackCats = [
            { id: 'err1', name: 'Restaurants', icon: '🍽️' },
            { id: 'err2', name: 'Retail', icon: '🛍️' },
            { id: 'err3', name: 'Services', icon: '🔧' }
        ];
        populateCategories(categorySelect, fallbackCats);
    }
}

function populateCategories(select, categories) {
    select.innerHTML = '<option value="">Select a category...</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon} ${category.name}`;
        select.appendChild(option);
    });
}

// Handle file selection
const imagesInput = document.getElementById('images');
if (imagesInput) {
    imagesInput.addEventListener('change', (e) => {
        selectedFiles = Array.from(e.target.files).slice(0, 5); // Max 5 images
        displayImagePreviews();
    });
}

// Display image previews
function displayImagePreviews() {
    const previewDiv = document.getElementById('imagePreview');

    if (selectedFiles.length === 0) {
        previewDiv.classList.add('hidden');
        return;
    }

    previewDiv.classList.remove('hidden');
    previewDiv.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-preview" onclick="removeImage(${index})" aria-label="Remove image">×</button>
            `;
            previewDiv.appendChild(previewItem);
        };

        reader.readAsDataURL(file);
    });
}

// Remove image from selection
window.removeImage = function (index) {
    selectedFiles.splice(index, 1);
    // Note: We can't easily remove a single file from the input[type=file]
    // So we just clear it. The user will have to re-select if they want to add more.
    // A better way would be to keep track of files in an array (which we do in selectedFiles)
    // and use that for the final upload.
    displayImagePreviews();
};

// Handle form submission
const form = document.getElementById('createBusinessForm') || document.getElementById('businessForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const errorDiv = document.getElementById('errorMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        errorDiv.classList.add('hidden');

        try {
            // 1. Gather Data
            const name = document.getElementById('businessName').value;
            let description = document.getElementById('description').value;
            const categorySelect = document.getElementById('category');
            const openingHours = document.getElementById('openingHours').value; // Get value

            // Append opening hours to description strictly for display since column is missing
            if (openingHours) {
                description += `\n\n🕒 Opening Hours: ${openingHours}`;
            }
            const categoryName = categorySelect.options[categorySelect.selectedIndex].text;

            // 2. Submit for Admin Review (No AI)
            submitBtn.textContent = 'Submitting...';

            // Skip AI, go straight to pending
            const aiResult = { score: 0, reason: "Manual submission" };

            // 3. Upload Images

            // 3. Upload Images
            const imageUrls = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const url = await uploadFile(file, 'images');
                    if (url) imageUrls.push(url);
                }
            }

            // 4. Upload Brochure (Skipped: bucket 'brochures' not created)
            let brochureUrl = null;
            /* 
            const brochureInput = document.getElementById('brochure');
            if (brochureInput && brochureInput.files.length > 0) {
                // brochureUrl = await uploadFile(brochureInput.files[0], 'brochures');
            }
            */

            // 5. Create Database Entry
            const businessData = {
                name: name,
                description: description,
                category_id: categorySelect.value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value || null,
                address: document.getElementById('address').value,
                website: document.getElementById('website').value || null,
                // opening_hours: openingHours, // Column missing db-side
                images: imageUrls,
                // Brochure upload (disabled until bucket exists)
                // brochure_url: brochureUrl, 
                owner_id: currentUser.id,
                status: 'pending', // Waiting for admin approval
                // ai_score: aiResult.score, // Column does not exist in DB
                // For now, minimal schema
            };

            const { error } = await supabase
                .from('businesses')
                .insert([businessData]);

            if (error) throw error;

            alert('Business created successfully!');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Error creating business:', error);
            errorDiv.textContent = error.message; // Show specific AI error
            errorDiv.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Business Listing';
        }
    });
}


// Generic Upload Function
async function uploadFile(file, bucket) {
    try {
        const timestamp = Date.now();
        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${currentUser.id}/${timestamp}_${safeName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filename);

        return urlData.publicUrl;
    } catch (error) {
        console.error(`Error uploading to ${bucket}:`, error);
        return null; // Don't fail entire flow if one file fails? Or simpler: fail
    }
}
