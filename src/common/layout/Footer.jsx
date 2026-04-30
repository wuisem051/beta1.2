import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from '../../context/ThemeContext';
import {
  FaTwitter, FaTelegramPlane, FaInstagram, FaFacebookF,
  FaYoutube, FaMediumM, FaLinkedinIn, FaDiscord,
  FaRedditAlien, FaTiktok, FaStar
} from 'react-icons/fa';
import styles from './Footer.module.css';

const Footer = () => {
  const [footerText, setFooterText] = useState(`© 2022 - ${new Date().getFullYear()} MaxiOS. All rights reserved`);

  useEffect(() => {
    const fetchFooterText = async () => {
      try {
        const docRef = doc(db, 'settings', 'siteConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.footerText) setFooterText(data.footerText);
        }
      } catch (err) {
        console.error("Error fetching footer text:", err);
      }
    };
    fetchFooterText();
  }, []);

  const footerLinks = [
    {
      title: 'Empresa',
      links: [
        'Acerca de MaxiOS', 'Anuncios', 'Blog', 'Preuve de Réserves',
        'Acuerdo de Usuario', 'Política de Privacidad', 'Aviso legal',
        'Mejora Regulatoria y Legal', 'Advertencia de Riesgo', 'Políticas AML'
      ]
    },
    {
      title: 'Mercado',
      links: [
        'BTC to USDT', 'ETH to USDT', 'SOL to USDT', 'XRP to USDT',
        'DOGE to USDT', 'ADA to USDT', 'SUI to USDT', 'LTC to USDT',
        'Todos los mercados cripto'
      ]
    },
    {
      title: 'Trading',
      extras: [
        { title: 'Trading', links: ['Spot', 'Futuros', 'Ganancias Fáciles', 'Comisiones'] },
        { title: 'Soporte', links: ['Centro de Ayuda', 'Informe Fiscal', 'Verificación Oficial', 'Comentarios y Sugerencias', 'Registro de cambios del producto', 'Contactar a MaxiOS', 'Enviar Solicitud'] }
      ]
    },
    {
      title: 'Herramientas',
      links: ['Promociones', 'Centro de Tareas', 'Trading P2P', 'Terceros', 'Download']
    },
    {
      title: 'Socio',
      links: ['VIP', 'Programa de Afiliados', 'Reembolsos por referidos', 'API']
    }
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Brand & Social Column */}
          <div className={styles.brandSection}>
            <div className={styles.logo}>
              <img
                src="/logo.png"
                alt="MaxiOS"
                style={{
                  height: '35px',
                  width: 'auto',
                  mixBlendMode: 'lighten',
                  filter: 'brightness(1.1)'
                }}
              />
            </div>
            <div className={styles.socialIcons}>
              <a href="#" className={styles.socialLink}><FaTwitter /></a>
              <a href="#" className={styles.socialLink}><FaTelegramPlane /></a>
              <a href="#" className={styles.socialLink}><FaInstagram /></a>
              <a href="#" className={styles.socialLink}><FaFacebookF /></a>
              <a href="#" className={styles.socialLink}><FaYoutube /></a>
              <a href="#" className={styles.socialLink}><FaMediumM /></a>
              <a href="#" className={styles.socialLink}><FaLinkedinIn /></a>
              <a href="#" className={styles.socialLink}><FaDiscord /></a>
              <a href="#" className={styles.socialLink}><FaRedditAlien /></a>
              <a href="#" className={styles.socialLink}><FaTiktok /></a>
            </div>
          </div>

          {/* Dynamic Columns */}
          {footerLinks.map((col, i) => (
            <div key={i} className={styles.column}>
              {col.extras ? (
                col.extras.map((extra, j) => (
                  <div key={j} style={{ marginBottom: j === 0 ? '3rem' : 0 }}>
                    <h4 className={styles.columnTitle}>{extra.title}</h4>
                    <div className={styles.linkList}>
                      {extra.links.map((link, k) => (
                        <a key={k} href="#" className={styles.linkItem}>{link}</a>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <h4 className={styles.columnTitle}>{col.title}</h4>
                  <div className={styles.linkList}>
                    {col.links.map((link, j) => (
                      <a key={j} href="#" className={styles.linkItem}>{link}</a>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.copyright}>{footerText}</div>
          <div className={styles.trustpilot}>
            Reseñanos en <FaStar className={styles.starIcon} /> Trustpilot
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
