import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ symbol, theme = 'dark', interval = '15' }) {
    const container = useRef();

    useEffect(
        () => {
            const script = document.createElement("script");
            script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
            script.type = "text/javascript";
            script.async = true;
            script.innerHTML = `
        {
          "autosize": true,
          "symbol": "${symbol.includes('.') || symbol.includes(':') ? symbol : 'BINANCE:' + symbol}",
          "interval": "${interval}",
          "timezone": "Etc/UTC",
          "theme": "${theme}",
          "style": "1",
          "locale": "es",
          "allow_symbol_change": true,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`;
            container.current.innerHTML = '';
            container.current.appendChild(script);
        },
        [symbol, theme, interval]
    );

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
            <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
        </div>
    );
}

export default memo(TradingViewWidget);
