"use client";
import Link from "next/link";
import styles from "./styles/HomePage.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      {/* Top Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navLinks}>
          <a href="/home" className={styles.navLink}>
            FreedomLedger
          </a>
        </div>
        <div>
          <Link href="/login" className={styles.navLink}>
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Page Content */}
      <section className={styles.section}>
        <h1 className="text-black text-2xl">Welcome to Our Homepage</h1>
        <p className="text-black">
        </p>
      </section>
    </main>
  );
}
