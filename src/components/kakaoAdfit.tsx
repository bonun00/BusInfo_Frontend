import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        adfit?: any;
    }
}

interface Props {
    appendChild?:String;
}

const KakaoAdfit: React.FC = () => {

    const scriptElement = useRef<HTMLModElement>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.setAttribute(
            "src",
            "https://t1.daumcdn.net/kas/static/ba.min.js"
        );
        script.setAttribute(
            "charset",
            "utf-8"
        );

        script.setAttribute("async", "true");
        scriptElement.current?.appendChild(script);
    }, []);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: '50px', margin: '1.2rem 0' }}>
            <ins
                ref={scriptElement}
                className="kakao_ad_area"
                style={{ display: 'none' }}
                data-ad-unit="DAN-C0qDIA2Cc0fcPtnf"
                data-ad-width="320"
                data-ad-height="50"
            />
        </div>
    );
};

export default KakaoAdfit;