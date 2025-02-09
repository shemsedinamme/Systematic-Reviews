import React from 'react';
import styles from './Post.module.css';

const Post = () => {
    return (
        <section id="boxes" className={styles.boxes}>
            <div className={styles.wp_block_query}>
                <div className={styles.wp_block_group}>
                    <div className={styles.container}>
                        <div className={styles.column}>
                            <div className={styles.wp_block_post_content}>
                                <h2>Post Title 1</h2>
                                <p>Post excerpt or content goes here...</p>
                            </div>
                        </div>
                        <div className={styles.column}>
                            <div className={styles.wp_block_post_content}>
                                <h2>Post Title 2</h2>
                                <p>Post excerpt or content goes here...</p>
                            </div>
                        </div>
                        <div className={styles.column}>
                            <div className={styles.wp_block_post_content}>
                                <h2>Post Title 3</h2>
                                <p>Post excerpt or content goes here...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Post;