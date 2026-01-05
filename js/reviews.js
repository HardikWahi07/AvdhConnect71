// Product Review System

let selectedRating = 0;

// Render star rating display (read-only)
function renderStarRating(rating, size = '') {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(`<span class="star ${i <= rating ? 'filled' : ''}">★</span>`);
    }
    return `<div class="star-rating ${size}">${stars.join('')}</div>`;
}

// Open review modal
async function openReviewModal(productId) {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('Please login to write a review', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Check if user has purchased this product
    const hasPurchased = await checkPurchaseHistory(productId, session.user.id);
    if (!hasPurchased) {
        showToast('You can only review products you have ordered', 'error');
        return;
    }

    // Check if user already reviewed
    const { data: existingReview } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', session.user.id)
        .single();

    selectedRating = existingReview ? existingReview.rating : 0;
    const existingText = existingReview ? existingReview.review_text : '';

    // Create modal
    let modal = document.getElementById('reviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reviewModal';
        modal.className = 'review-modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="review-modal-content">
            <div class="flex justify-between items-center mb-lg">
                <h2 style="margin: 0;">${existingReview ? 'Edit Your Review' : 'Write a Review'}</h2>
                <button class="btn-icon" onclick="closeReviewModal()" style="font-size: 2rem; background: none; border: none; cursor: pointer;">&times;</button>
            </div>

            <div>
                <label style="display: block; margin-bottom: var(--space-sm); font-weight: 600;">Your Rating *</label>
                <div class="star-selector" id="starSelector">
                    ${[1, 2, 3, 4, 5].map(i =>
        `<span class="star ${i <= selectedRating ? 'filled' : ''}" onclick="setRating(${i})">★</span>`
    ).join('')}
                </div>
            </div>

            <div class="mt-lg">
                <label style="display: block; margin-bottom: var(--space-sm); font-weight: 600;">Your Review (Optional)</label>
                <textarea id="reviewText" class="review-textarea" placeholder="Share your experience with this product...">${existingText || ''}</textarea>
            </div>

            <div class="flex gap-md mt-lg">
                <button class="btn btn-primary" style="flex: 1;" onclick="submitReview('${productId}')">
                    ${existingReview ? 'Update Review' : 'Submit Review'}
                </button>
                <button class="btn btn-secondary" onclick="closeReviewModal()">Cancel</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.classList.add('hidden');
    selectedRating = 0;
}

function setRating(rating) {
    selectedRating = rating;
    document.querySelectorAll('#starSelector .star').forEach((star, idx) => {
        star.classList.toggle('filled', idx < rating);
    });
}

async function checkPurchaseHistory(productId, userId) {
    try {
        const { data, error } = await supabase
            .from('order_items')
            .select('order_id, orders!inner(user_id, status)')
            .eq('product_id', productId)
            .eq('orders.user_id', userId)
            .in('orders.status', ['delivered', 'out_for_delivery', 'packing', 'accepted']);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking purchase history:', error);
        return false;
    }
}

async function submitReview(productId) {
    if (selectedRating === 0) {
        showToast('Please select a rating', 'error');
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const hasPurchased = await checkPurchaseHistory(productId, session.user.id);

        const reviewData = {
            product_id: productId,
            user_id: session.user.id,
            rating: selectedRating,
            review_text: reviewText || null,
            verified_purchase: hasPurchased
        };

        const { error } = await supabase
            .from('product_reviews')
            .upsert(reviewData, { onConflict: 'product_id,user_id' });

        if (error) throw error;

        showToast('Review submitted successfully! 🎉', 'success');
        closeReviewModal();

        // Reload reviews
        setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Failed to submit review. Please try again.', 'error');
    }
}

async function loadReviews(productId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Get current session to identify own reviews
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;

        // Load reviews
        const { data: reviews, error } = await supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-reviews">
                    <div class="empty-reviews-icon">⭐</div>
                    <p>No reviews yet. Be the first to review this product!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reviews.map(review => {
            const isCurrentUser = currentUserId && review.user_id === currentUserId;
            const userName = isCurrentUser ? 'You' : 'Customer';
            const initials = isCurrentUser ? 'Y' : 'C';
            const reviewDate = new Date(review.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            return `
                <div class="review-card">
                    <div class="review-header">
                        <div class="review-author">
                            <div class="review-avatar">${initials}</div>
                            <div class="review-author-info">
                                <div style="display: flex; align-items: center;">
                                    <span class="review-author-name">${userName}</span>
                                    ${review.verified_purchase ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
                                </div>
                                <span class="review-date">${reviewDate}</span>
                            </div>
                        </div>
                        ${renderStarRating(review.rating, 'star-rating-sm')}
                    </div>
                    ${review.review_text ? `<p class="review-text">${review.review_text}</p>` : ''}
                    
                    ${review.owner_reply ? `
                        <div class="owner-reply">
                            <div class="owner-reply-header">
                                <strong>💼 Business Owner</strong>
                                <span style="color: var(--text-tertiary); font-size: 0.85rem;">
                                    ${new Date(review.owner_reply_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <p>${review.owner_reply}</p>
                        </div>
                    ` : ''}
                    
                    <div id="replyBtn_${review.id}"></div>
                </div>
            `;
        }).join('');

        // Check if current user is the business owner to show reply buttons
        checkBusinessOwner(productId);

    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = '<p style="color: var(--error);">Failed to load reviews</p>';
    }
}

async function checkBusinessOwner(productId) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: product } = await supabase
            .from('products')
            .select('business_id, businesses(owner_id)')
            .eq('id', productId)
            .single();

        if (product && product.businesses.owner_id === session.user.id) {
            // User is the business owner, show reply buttons
            const reviews = document.querySelectorAll('.review-card');
            reviews.forEach((card, idx) => {
                const reviewId = card.querySelector('[id^="replyBtn_"]').id.split('_')[1];
                const replyBtn = document.getElementById(`replyBtn_${reviewId}`);
                const hasReply = card.querySelector('.owner-reply');

                if (!hasReply && replyBtn) {
                    replyBtn.innerHTML = `
                        <button class="btn btn-outline btn-sm" style="margin-top: var(--space-md);" onclick="openReplyModal('${reviewId}')">
                            💬 Reply to Review
                        </button>
                    `;
                }
            });
        }
    } catch (error) {
        console.error('Error checking business owner:', error);
    }
}

async function openReplyModal(reviewId) {
    const reply = prompt('Enter your reply to this review:');
    if (!reply) return;

    try {
        const { error } = await supabase
            .from('product_reviews')
            .update({
                owner_reply: reply,
                owner_reply_at: new Date().toISOString()
            })
            .eq('id', reviewId);

        if (error) throw error;

        showToast('Reply posted successfully!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error posting reply:', error);
        showToast('Failed to post reply', 'error');
    }
}

// Make functions globally accessible
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.setRating = setRating;
window.submitReview = submitReview;
window.loadReviews = loadReviews;
window.renderStarRating = renderStarRating;
