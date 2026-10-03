package com.malsseum.annae;

import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.window.SplashScreenView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
 private SplashScreenView launchView;
 private android.graphics.Rect launchIconBounds;
 private ViewGroup webParent;
 private ViewGroup.LayoutParams webLayout;
 private int webIndex;
 private boolean fadeStarted;
 private boolean finished;

 @Override public void onCreate(Bundle savedInstanceState) {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
   getSplashScreen().setOnExitAnimationListener(splash -> {
    launchView = splash;
    android.view.View icon = splash.getIconView();
    if (icon != null) {
     int[] origin = new int[2];
     icon.getLocationOnScreen(origin);
     launchIconBounds = new android.graphics.Rect(origin[0],origin[1],origin[0]+icon.getWidth(),origin[1]+icon.getHeight());
    }
    // The existing WebView supplies only text/animation beneath the one system logo.
    WebView web = bridge.getWebView();
    webParent = (ViewGroup)web.getParent();
    webLayout = web.getLayoutParams();
    webIndex = webParent.indexOfChild(web);
    webParent.removeView(web);
    splash.addView(web,0,new android.widget.FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
    placeText(web);
    if (finished) finishSplash();
   });
  }
  super.onCreate(savedInstanceState);
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
   bridge.getWebView().addJavascriptInterface(new Object() {
    @JavascriptInterface public void startFade() {runOnUiThread(() -> fadeLogo());}
    @JavascriptInterface public void finish() {runOnUiThread(() -> finishSplash());}
   },"MalsseumAndroidSplash");
   bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
    @Override public void onPageCommitVisible(WebView web,String url) {super.onPageCommitVisible(web,url);placeText(web);}
    @Override public void onPageFinished(WebView web,String url) {super.onPageFinished(web,url);placeText(web);}
   });
   bridge.getWebView().postDelayed(() -> finishSplash(),5000);
  }
 }
 private void placeText(WebView web) {
  if (launchIconBounds == null) return;
  int[] origin = new int[2];
  web.getLocationOnScreen(origin);
  double canvasWidth=launchIconBounds.width()*1.5,canvasHeight=launchIconBounds.height()*1.5;
  double left=launchIconBounds.exactCenterX()-origin[0]+canvasWidth*(172.0/864-0.5);
  double top=launchIconBounds.exactCenterY()-origin[1]+canvasHeight*(110.0/864-0.5);
  double width=canvasWidth*520.0/864,height=canvasHeight*590.0/864;
  web.evaluateJavascript("(function(){var s=document.getElementById('brand-splash'),b=s&&s.querySelector('.splash-brand'),p=s&&s.querySelector('.native-logo-space');if(!b||!p)return;var d=window.devicePixelRatio||1;b.style.cssText='position:absolute;left:'+("+left+"/d)+'px;top:'+("+top+"/d)+'px;width:'+("+width+"/d)+'px;transform:none';p.style.width=("+width+"/d)+'px';p.style.height=("+height+"/d)+'px';})()",null);
 }
 private void fadeLogo() {
  if (fadeStarted || launchView == null || launchView.getIconView() == null) return;
  fadeStarted=true;
  // Match the existing CSS ease/350ms fade, once; no per-frame WebView polling.
  launchView.getIconView().animate().alpha(0f).setDuration(350)
   .setInterpolator(new android.view.animation.PathInterpolator(.25f,.1f,.25f,1f)).start();
 }
 private void finishSplash() {
  finished=true;
  if (launchView == null) return;
  WebView web=bridge.getWebView();
  SplashScreenView splash=launchView;
  launchView=null;
  if (web.getParent()==splash && webParent!=null) {
   splash.removeView(web);
   webParent.addView(web,webIndex,webLayout);
  }
  web.postVisualStateCallback(0,new WebView.VisualStateCallback() {
   @Override public void onComplete(long requestId) {web.postOnAnimation(() -> splash.remove());}
  });
 }
}