import {CameraView, useCameraPermissions} from 'expo-camera';
import {useState, useRef, useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View, Image} from 'react-native';
import {FaBeer} from 'react-icons/fa';
import Button from './Button'
import {Cloudinary} from 'cloudinary-core';
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { OPENAI_API_KEY } from '@env';

export default function UploadImage() {
    const [facing, setFacing] = useState('back');
    const [photo, setPhoto] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);
    const [photoUri, setPhotoUri] = useState(null)
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);


    const cloudinary = new Cloudinary({cloud_name: 'dcfqbqckg', secure: true});


    useEffect(() => {
        console.log('Photo state updated:', photo);
    }, [photo]);

    useEffect(() => {
        console.log('PhotoUri state updated:', photoUri);
    }, [photoUri]);

    useEffect(() => {
        (async () => {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            // setPermission(status === 'granted');
        })();
    }, []);


    const takePicture = async () => {
        try {
            const data = await cameraRef.current.takePictureAsync();

            console.log(data.uri)
            setPhoto(data.uri);


            // uploadImage(data.uri);
        } catch (error) {
            console.log(error);
        }
    };

    const uploadImage = async () => {
        console.log("photo:    ")
        const formData = new FormData();
        formData.append('file', {uri: photo, name: 'photo.jpg', type: 'image/jpeg'});
        formData.append('upload_preset', 'ml_default');

        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/dcfqbqckg/image/upload`, formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            // console.log(response.data);
            console.log("response.data.secure_url:    " + response.data.secure_url)
            if (response.data.secure_url){
                callOpenAI(response.data.secure_url);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    const callOpenAI = async (uri) => {
        console.log("openAI")
        try {
            const res = await axios.post('https://api.openai.com/v1/chat/completions',
                {
                    model:"gpt-4o",
                    messages:[
                        {
                            role: "user",
                            content: [
                                {type: "text", text: "return JSON with the features for the image: type(shirt,pants...),style(elegant...),color,season"},
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: uri.toString(),
                                    },
                                },
                            ],
                        }
                    ],
                    max_tokens: 50
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
            // console.log(res)
            console.log("openAI:   " + res.data.choices[0].message.content);
            setUploadResult(res.data.choices[0].message.content);
        } catch (error) {
            console.error(error);
        }
    };


    if (!permission) {
        // Camera permissions are still loading.
        return <View/>;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                {/*<FaBeer className='beer' />*/}

                <Text style={{textAlign: 'center'}}>We need your permission to show the camera</Text>
                <Button title="grant permission" onPress={requestPermission} />
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    return (
        <View style={styles.container}>
            {
                !photo ?
                    <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                        <View style={styles.buttonContainer}>
                            <Button title="Flip" onPress={toggleCameraFacing}></Button>
                            <Button title="take pic" onPress={takePicture}></Button>
                        </View>
                    </CameraView>
                    : (
                        <View style={{alignItems: 'center', justifyContent: 'center'}}>
                            <Image source={{uri: photo}} style={{width: 300, height: 600}}/>
                            <Button title="Upload" onPress={uploadImage}/>
                            <Button title="Retake" onPress={() => setPhoto(null)}/>
                        </View>
                    )
            }
            {uploadResult && (
                <View style={{marginTop: 20}}>
                    <Image source={{uri: uploadResult.secure_url}} style={{width: 300, height: 300, marginTop: 10}}/>
                    {/*<Text>{uploadResult}</Text>*/}
                </View>)
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
        justifyContent: 'flex-end',

    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
});