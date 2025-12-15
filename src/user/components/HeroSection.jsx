import React from 'react';

const HeroSection = ({ homeText, heroTitle }) => {
  return (
    <section className="text-center py-20 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-dark_text mb-3">{heroTitle}</h1>
      <p className="text-lg text-gray_text max-w-3xl mx-auto">
        {homeText}
      </p>
    </section>
  );
};

export default HeroSection;
