import React from 'react'
import styles from '@/sidebar/PoweredBy.module.css'

export default function PoweredBy() {
    return (
        <div className={styles.poweredByContainer}>
            <a
                className={styles.creditLink}
                href="https://www.graphhopper.com/"
                target="_blank"
                rel="noopener noreferrer"
            >
                Routing by GraphHopper
            </a>
        </div>
    )
}
