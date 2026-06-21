<?php
/**
 * AutoBlog → Rank Math REST helper.
 *
 * Paste the body of this snippet (everything inside, you can keep or drop the
 * opening <?php) into WordPress admin → Snippets (Code Snippets plugin) → Add New
 * → "Run snippet everywhere" → Activate.
 *
 * It exposes Rank Math's per-post meta to the REST API so the AutoBlog generator
 * can set the focus keyword, SEO title/description, and SEO score when it publishes
 * a post over REST (with an Application Password). Without this, WordPress strips
 * those unknown meta keys and Rank Math shows "Not analyzed" / no score.
 */
add_action('init', function () {
    $auth = function () { return current_user_can('edit_posts'); };

    $string_keys = [
        'rank_math_focus_keyword',
        'rank_math_title',
        'rank_math_description',
    ];
    foreach ($string_keys as $key) {
        register_post_meta('post', $key, [
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => $auth,
        ]);
    }

    register_post_meta('post', 'rank_math_seo_score', [
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'integer',
        'auth_callback' => $auth,
    ]);
});
